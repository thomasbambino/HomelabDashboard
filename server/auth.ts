import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail } from "./email";

const scryptAsync = promisify(scrypt);

// Add rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes
};

// Add rate limiting middleware
async function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  const identifier = req.body.username || req.body.identifier || req.body.email;
  const ip = req.ip;
  const type = req.path.includes('reset') ? 'reset' : 'login';

  try {
    // Get attempts within the time window
    const attempts = await storage.getLoginAttempts(identifier, ip, type, RATE_LIMIT.WINDOW_MS);

    if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
      const oldestAttempt = await storage.getOldestLoginAttempt(identifier, ip, type);
      if (!oldestAttempt) {
        return res.sendStatus(429);
      }

      const timeSinceOldest = Date.now() - oldestAttempt.timestamp.getTime();
      const timeRemaining = RATE_LIMIT.WINDOW_MS - timeSinceOldest;

      if (timeRemaining > 0) {
        return res.sendStatus(429);
      }

      // If window has passed, clear old attempts
      await storage.clearLoginAttempts(identifier, ip, type);
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next(error);
  }
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
}

// Middleware to check if user is approved
export function isApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (!req.user.approved) return res.sendStatus(403);
  next();
}

// Add this helper function at the top
function canModifyUser(requestingUser: any, targetUserId: number) {
  // Superadmins can modify anyone
  if (requestingUser.role === 'superadmin') return true;

  // Regular admins cannot modify superadmins
  if (requestingUser.role === 'admin') {
    const targetUser = storage.getUser(targetUserId);
    if (targetUser && targetUser.role === 'superadmin') return false;
    return true;
  }

  // Regular users can only modify themselves
  return requestingUser.id === targetUserId;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try to find user by username first, then by email
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.getUserByEmail(username);
        }

        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } 

        // Check if the user account is approved (enabled)
        if (!user.approved) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const { username, password, email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).send("Email already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      email,
      password: await hashPassword(password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", checkRateLimit, async (req, res, next) => {
    try {
      const identifier = req.body.username;
      const ip = req.ip;
      const type = 'login';

      passport.authenticate("local", async (err: any, user: any, info: any) => {
        if (err) return next(err);

        if (!user) {
          // Log failed attempt
          await storage.addLoginAttempt({
            identifier,
            ip,
            type,
            timestamp: new Date()
          });

          return res.sendStatus(401); // Only send status code, no message
        }

        req.logIn(user, (err) => {
          if (err) return next(err);
          // Clear attempts on successful login
          storage.clearLoginAttempts(identifier, ip, type)
            .catch(console.error);
          res.json(user);
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/request-reset", checkRateLimit, async (req, res) => {
    const { identifier } = req.body;

    try {
      // Log reset attempt
      await storage.addLoginAttempt({
        identifier,
        ip: req.ip,
        type: 'reset',
        timestamp: new Date()
      });

      // Find user by username or email
      let user = await storage.getUserByUsername(identifier);
      if (!user) {
        user = await storage.getUserByEmail(identifier);
      }

      // Get all admin users
      const admins = await storage.getAllUsers();
      const adminEmails = admins
        .filter(admin => admin.role === 'admin' && admin.email)
        .map(admin => admin.email);

      if (user && adminEmails.length > 0) {
        // Send email to all admins
        for (const adminEmail of adminEmails) {
          if (adminEmail) {
            await sendEmail({
              to: adminEmail,
              subject: "Password Reset Request",
              html: `
                <p>A password reset has been requested for user: ${user.username}</p>
                <p>User Email: ${user.email || 'No email provided'}</p>
                <p>Please log in to the admin panel to reset their password.</p>
              `
            });
          }
        }
      }

      // Always return success to prevent user enumeration
      res.json({ message: "If the account exists, admins have been notified of your password reset request." });
    } catch (error) {
      console.error('Reset request error:', error);
      res.status(500).json({ message: "An error occurred processing your request" });
    }
  });

  app.get("/api/users", isAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/users/:id", isAdmin, async (req, res) => {
    const targetUserId = parseInt(req.params.id);

    // Check if the requesting admin can modify this user
    if (!canModifyUser(req.user, targetUserId)) {
      return res.status(403).json({ 
        message: "Regular admins cannot modify superadmin users" 
      });
    }

    // Check if trying to set role to superadmin
    if (req.body.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        message: "Only superadmins can grant superadmin privileges" 
      });
    }

    const user = await storage.updateUser({
      id: targetUserId,
      ...req.body,
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post("/api/admin/reset-user-password", isAdmin, async (req, res) => {
    const { userId } = req.body;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const tempPassword = randomBytes(8).toString('hex');

    await storage.updateUser({
      id: user.id,
      password: await hashPassword(tempPassword),
    });

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Password Reset",
        html: `
          <p>Your password has been reset by an administrator.</p>
          <p>Your new password is: ${tempPassword}</p>
          <p>Please log in with this password and change it at your earliest convenience.</p>
        `
      });
    }

    res.json({ 
      message: "Password reset successful",
      tempPassword: user.email ? undefined : tempPassword // Only send temp password in response if user has no email
    });
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", isAdmin, async (req, res) => {
    try {
      const currentSettings = await storage.getSettings();
      const settings = await storage.updateSettings({
        id: currentSettings.id,
        ...req.body
      });
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.patch("/api/users/:id/preferences", isApproved, async (req, res) => {
    if (req.user?.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: "You can only update your own preferences" });
    }

    const user = await storage.updateUser({
      id: parseInt(req.params.id),
      show_refresh_interval: req.body.show_refresh_interval,
      show_last_checked: req.body.show_last_checked,
      show_service_url: req.body.show_service_url,
      show_uptime_log: req.body.show_uptime_log,
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get("/api/notification-preferences", isApproved, async (req, res) => {
    const preferences = await storage.getUserNotificationPreferences(req.user!.id);
    res.json(preferences);
  });

  app.post("/api/notification-preferences", isApproved, async (req, res) => {
    const { serviceId, email, enabled } = req.body;

    const existingPref = await storage.getNotificationPreference(req.user!.id, serviceId);

    if (existingPref) {
      const updatedPref = await storage.updateNotificationPreference({
        id: existingPref.id,
        email,
        enabled
      });
      res.json(updatedPref);
    } else {
      const newPref = await storage.createNotificationPreference({
        userId: req.user!.id,
        serviceId,
        email,
        enabled
      });
      res.json(newPref);
    }
  });

  app.get("/api/email-templates", isAdmin, async (req, res) => {
    const templates = await storage.getAllEmailTemplates();
    res.json(templates);
  });

  app.post("/api/email-templates", isAdmin, async (req, res) => {
    const template = await storage.createEmailTemplate(req.body);
    res.json(template);
  });

  app.patch("/api/email-templates/:id", isAdmin, async (req, res) => {
    const template = await storage.updateEmailTemplate({
      id: parseInt(req.params.id),
      ...req.body
    });
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  app.post("/api/test-notification", isAdmin, async (req, res) => {
    const { templateId, email } = req.body;

    const template = await storage.getEmailTemplate(templateId);
    if (!template) return res.status(404).json({ message: "Template not found" });

    const testData = {
      serviceName: "Test Service",
      status: "offline",
      timestamp: new Date().toISOString(),
      duration: "5 minutes"
    };

    const html = compileTemplate(template.template, testData);

    const success = await sendEmail({
      to: email,
      subject: template.subject,
      html
    });

    if (success) {
      res.json({ message: "Test email sent successfully" });
    } else {
      res.status(500).json({ message: "Failed to send test email" });
    }
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Placeholder for compileTemplate function.  Replace with your actual implementation.
function compileTemplate(template: string, data: any): string {
  // Implement your templating engine here (e.g., using Handlebars, EJS, etc.)
  return template; // Replace with actual compiled template
}