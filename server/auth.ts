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

// Middleware updates for role checks
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.sendStatus(403);
  next();
}

// Add a new middleware for superadmin-only routes
export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== 'superadmin') return res.sendStatus(403);
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
  // Superadmins can modify anyone except other superadmins
  if (requestingUser.role === 'superadmin') {
    const targetUser = storage.getUser(targetUserId);
    // Only allow superadmin to modify other superadmins
    if (targetUser && targetUser.role === 'superadmin' && requestingUser.id !== targetUserId) {
      return false;
    }
    return true;
  }

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
        console.log("Attempting login for username:", username);

        // Try to find user by username first, then by email
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.getUserByEmail(username);
        }

        if (!user) {
          console.log("No user found with username/email:", username);
          return done(null, false);
        }

        const passwordMatches = await comparePasswords(password, user.password);
        console.log("Password comparison result:", passwordMatches);

        if (!passwordMatches) {
          return done(null, false);
        }

        // Check if the user account is enabled and approved
        if (!user.approved) {
          console.log("User not approved:", username);
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
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

      console.log("Login attempt - IP:", ip, "Username:", identifier);

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

          return res.sendStatus(401);
        }

        req.logIn(user, async (err) => {
          if (err) return next(err);

          console.log(`Updating IP for user ${user.username} to ${ip}`);

          // Update user's last IP and clear attempts on successful login
          await storage.updateUser({
            id: user.id,
            last_ip: ip
          });

          await storage.clearLoginAttempts(identifier, ip, type);

          console.log(`Successfully updated IP for user ${user.username}`);

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

  //Updated request-reset endpoint
  app.post("/api/request-reset", checkRateLimit, async (req, res) => {
    const { email } = req.body;

    try {
      // Log reset attempt
      await storage.addLoginAttempt({
        identifier: email,
        ip: req.ip,
        type: 'reset',
        timestamp: new Date()
      });

      // Find user by email
      const user = await storage.getUserByEmail(email);

      if (user && user.email) {
        // Generate reset token
        const resetToken = await generateResetToken();
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

        // Update user with reset token
        await storage.updateUser({
          id: user.id,
          reset_token: resetToken,
          reset_token_expires: resetTokenExpires
        });

        // Send reset email
        const resetLink = `${req.protocol}://${req.get('host')}/auth/reset/${resetToken}`;
        await sendEmail({
          to: user.email,
          subject: "Password Reset Request",
          html: `
            <p>You have requested to reset your password.</p>
            <p>Please click the link below to reset your password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this reset, please ignore this email.</p>
          `
        });
      }

      // Always return success to prevent user enumeration
      res.json({ 
        message: "If an account exists with this email address, you will receive password reset instructions." 
      });
    } catch (error) {
      console.error('Reset request error:', error);
      res.status(500).json({ 
        message: "An error occurred processing your request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/users", isAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/users/:id", isSuperAdmin, async (req, res) => { 
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

  app.delete("/api/users/:id", isSuperAdmin, async (req, res) => {
    const targetUserId = parseInt(req.params.id);
    const targetUser = await storage.getUser(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deletion of superadmin users
    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ message: "Cannot delete superadmin users" });
    }

    try {
      const deletedUser = await storage.deleteUser(targetUserId);
      if (deletedUser) {
        return res.status(200).json({ 
          message: "User deleted successfully",
          user: deletedUser
        });
      } else {
        return res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ 
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
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
      tempPassword: user.email ? undefined : tempPassword 
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

  //New endpoint for password reset
  app.post("/api/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
      const user = await storage.getUserByResetToken(token);

      if (!user || !user.reset_token_expires) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (new Date() > new Date(user.reset_token_expires)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Update password and clear reset token
      await storage.updateUser({
        id: user.id,
        password: await hashPassword(password),
        reset_token: null,
        reset_token_expires: null
      });

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ 
        message: "Failed to reset password",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 32)) as Buffer;
  const hashedPassword = `${buf.toString("hex")}.${salt}`;
  console.log("Generated hash length:", buf.length, "Generated hash:", hashedPassword);
  return hashedPassword;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hash, salt] = stored.split(".");
    if (!hash || !salt) {
      console.error('Invalid stored password format:', stored);
      return false;
    }
    const hashedBuf = Buffer.from(hash, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 32)) as Buffer;
    console.log("Stored hash length:", hashedBuf.length, "Supplied hash length:", suppliedBuf.length);
    console.log("Stored hash:", hash);
    console.log("Supplied hash:", suppliedBuf.toString("hex"));
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

// Update the generateHashForTest and IIFE to be more detailed
async function generateHashForTest() {
  const password = "admin123";
  const hashedPassword = await hashPassword(password);
  console.log("Test hash generated for 'admin123':", hashedPassword);
  return hashedPassword;
}

// Generate a hash and update admin user
(async () => {
  try {
    const hashedPassword = await generateHashForTest();
    console.log("Generated hash for admin user:", hashedPassword);
    // Also create the admin user directly
    const adminUser = await createAdminUser("admin", "admin123", "admin@example.com");
    console.log("Admin user created:", adminUser);
  } catch (error) {
    console.error("Error generating hash:", error);
  }
})();

// Update createAdminUser function to create a superadmin
async function createAdminUser(username: string, password: string, email: string) {
  const hashedPassword = await hashPassword(password);
  const newUser = await storage.createUser({ username, password: hashedPassword, email, role: 'superadmin', approved: true });
  console.log("Admin user created:", newUser);
  return newUser;
}


// Add new function for generating reset token
async function generateResetToken(): Promise<string> {
  return randomBytes(32).toString('hex');
}

// Placeholder for compileTemplate function.  Replace with your actual implementation.
function compileTemplate(template: string, data: any): string {
  // Implement your templating engine here (e.g., using Handlebars, EJS, etc.)
  return template; // Replace with actual compiled template
}