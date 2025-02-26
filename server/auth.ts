import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User as SelectUser } from "@shared/schema";
import { sendEmail } from "./email.js";
import { getIpInfo } from './utils/ip.js';

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

async function getClientIp(req: Request): Promise<string> {
  try {
    // Check for forwarded IP first (for proxied requests)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // Get the first IP if multiple are present
      const ip = Array.isArray(forwardedFor)
        ? forwardedFor[0].split(',')[0].trim()
        : forwardedFor.split(',')[0].trim();
      console.log('Found forwarded IP:', ip, 'from x-forwarded-for:', forwardedFor);
      return ip;
    }

    // Check other common proxy headers
    const proxyHeaders = [
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'true-client-ip'
    ];

    for (const header of proxyHeaders) {
      const proxyIp = req.headers[header];
      if (proxyIp) {
        console.log(`Found IP in ${header}:`, proxyIp);
        return Array.isArray(proxyIp) ? proxyIp[0] : proxyIp;
      }
    }

    // Get IP from request object as fallback
    if (req.ip) {
      console.log('Using req.ip:', req.ip);
      return req.ip;
    }

    // Ultimate fallback
    console.log('No IP found, using fallback');
    return '0.0.0.0';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return '0.0.0.0';
  }
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

  // Update the Google Strategy configuration and route handlers
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth' }),
    async (req, res) => {
      // Record successful login
      try {
        const clientIp = await getClientIp(req);
        const ipInfo = await getIpInfo(clientIp);
        await storage.addLoginAttempt({
          identifier: req.user?.email || 'google-auth',
          ip: ipInfo.ip || clientIp,
          type: 'success',
          timestamp: new Date(),
          isp: ipInfo.isp || null,
          city: ipInfo.city || null,
          region: ipInfo.region || null,
          country: ipInfo.country || null
        });
      } catch (error) {
        console.error('Failed to record Google login attempt:', error);
      }
      res.redirect('/');
    }
  );

  // Update the Google Strategy configuration
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "https://stylus.services/api/auth/google/callback",
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log("Google OAuth callback received for profile:", profile.id);
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'));
      }

      // Check if user exists with this email
      let user = await storage.getUserByEmail(email);

      if (user) {
        // Update user's Google ID if not set
        if (!user.google_id) {
          user = await storage.updateUser({
            id: user.id,
            google_id: profile.id
          });
        }
      } else {
        // Create new user with Google profile
        user = await storage.createUser({
          username: email.split('@')[0], // Use email prefix as username
          email: email,
          password: await hashPassword(randomBytes(32).toString('hex')), // Random password
          google_id: profile.id,
          approved: true // Auto-approve Google users
        });
      }

      return done(null, user);
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      return done(error);
    }
  }));

  // Keep existing LocalStrategy...
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

        console.log("Login successful. Temp password status:", user.temp_password);
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
      const clientIp = await getClientIp(req);
      const type = 'login';

      console.log("Login attempt - IP:", clientIp, "Username:", identifier);

      passport.authenticate("local", async (err: any, user: any, info: any) => {
        if (err) return next(err);

        if (!user) {
          try {
            // Get IP info and log failed attempt with location data
            const ipInfo = await getIpInfo(clientIp);
            await storage.addLoginAttempt({
              identifier,
              ip: ipInfo.ip || clientIp,
              type: 'failed',
              timestamp: new Date(),
              isp: ipInfo.isp || null,
              city: ipInfo.city || null,
              region: ipInfo.region || null,
              country: ipInfo.country || null
            });
          } catch (error) {
            console.error('Failed to record login attempt with geolocation:', error);
            // Still record the attempt, but without geolocation data
            await storage.addLoginAttempt({
              identifier,
              ip: clientIp,
              type: 'failed',
              timestamp: new Date()
            });
          }

          return res.sendStatus(401);
        }

        req.logIn(user, async (err) => {
          if (err) return next(err);

          try {
            // Update user's last IP and record successful login
            const ipInfo = await getIpInfo(clientIp);

            // Record successful login attempt
            await storage.addLoginAttempt({
              identifier,
              ip: ipInfo.ip || clientIp,
              type: 'success',
              timestamp: new Date(),
              isp: ipInfo.isp || null,
              city: ipInfo.city || null,
              region: ipInfo.region || null,
              country: ipInfo.country || null
            });

            // Update user's last IP
            await storage.updateUser({
              id: user.id,
              last_ip: ipInfo.ip || clientIp
            });

            // Include temp_password status in response
            res.json({
              ...user,
              requires_password_change: user.temp_password
            });
          } catch (error) {
            console.error('Failed to update user IP with geolocation:', error);
            // Still complete the login even if IP update fails
            res.json({
              ...user,
              requires_password_change: user.temp_password
            });
          }
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  });

  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    try {
      await storage.updateUser({
        id: req.user.id,
        password: await hashPassword(newPassword),
        temp_password: false
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post("/api/request-reset", checkRateLimit, async (req, res) => {
    const { identifier } = req.body;

    try {
      await storage.addLoginAttempt({
        identifier,
        ip: req.ip,
        type: 'reset',
        timestamp: new Date()
      });

      let user = await storage.getUserByUsername(identifier);
      if (!user) {
        user = await storage.getUserByEmail(identifier);
      }

      if (user && user.email) {
        const tempPassword = randomBytes(8).toString('hex');

        await storage.updateUser({
          id: user.id,
          password: await hashPassword(tempPassword),
          temp_password: true // Set temp_password flag
        });

        await sendEmail({
          to: user.email,
          subject: "Password Reset",
          html: `
            <p>Your password has been reset as requested.</p>
            <p>Your new temporary password is: ${tempPassword}</p>
            <p>Please log in with this password. You will be required to change your password upon login.</p>
          `
        });
      }

      res.json({ message: "If an account exists with this identifier, a password reset email has been sent." });
    } catch (error) {
      console.error('Reset request error:', error);
      res.status(500).json({ message: "An error occurred processing your request" });
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
      temp_password: true // Set temp_password flag
    });

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Password Reset",
        html: `
          <p>Your password has been reset by an administrator.</p>
          <p>Your new temporary password is: ${tempPassword}</p>
          <p>Please log in with this password. You will be required to change your password upon login.</p>
        `
      });
    }

    res.json({
      message: "Password reset successful",
      tempPassword: user.email ? undefined : tempPassword
    });
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

  app.get("/api/users", isAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
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

  //Google auth routes remain the same

  // Add Google auth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth' }),
    async (req, res) => {
      // Record successful login
      try {
        const clientIp = await getClientIp(req);
        const ipInfo = await getIpInfo(clientIp);
        await storage.addLoginAttempt({
          identifier: req.user?.email || 'google-auth',
          ip: ipInfo.ip || clientIp,
          type: 'success',
          timestamp: new Date(),
          isp: ipInfo.isp || null,
          city: ipInfo.city || null,
          region: ipInfo.region || null,
          country: ipInfo.country || null
        });
      } catch (error) {
        console.error('Failed to record Google login attempt:', error);
      }
      res.redirect('/');
    }
  );
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

// Update createAdminUser function to check for existing superadmins
async function createAdminUser(username: string, password: string, email: string) {
  try {
    // First check if any superadmin exists in the system
    const users = await storage.getAllUsers();
    const hasSuperAdmin = users.some(user => user.role === 'superadmin');

    if (hasSuperAdmin) {
      console.log("A superadmin already exists in the system, skipping admin creation");
      return null;
    }

    // If no superadmin exists, check if this specific user exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log("Admin user already exists, skipping creation");
      return existingUser;
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await storage.createUser({ 
      username, 
      password: hashedPassword, 
      email, 
      role: 'superadmin', 
      approved: true 
    });
    console.log("New admin user created:", newUser);
    return newUser;
  } catch (error) {
    console.error("Error in createAdminUser:", error);
    return null;
  }
}

function compileTemplate(template: string, data: any): string {
  // Implement your templating engine here (e.g., using Handlebars, EJS, etc.)
  return template; // Replace with actual compiled template
}