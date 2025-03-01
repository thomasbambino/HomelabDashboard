import admin from 'firebase-admin';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail } from "./email";
import { getIpInfo } from './utils/ip';

const scryptAsync = promisify(scrypt);

// Initialize Firebase Admin
try {
  // Delete any existing apps
  const apps = admin.apps;
  if (apps.length) {
    console.log('Cleaning up existing Firebase Admin apps...');
    apps.forEach(app => app && app.delete());
  }

  // Initialize with service account
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC3kwOwth/qERKe\nrWS96KCWxTgLff4gZr7ngFIQvDSE4PCUm5ln9unNNtPhbXnitnsn2xlid9jkiQPz\nQnS2bkK/cR18b+nSNlRmGqbbV52x9bk815vfqWL7cne0J0k8yjEFMPp+qjQFmTi7\n3CrG+q3U0XdBcM+5YGNUZSZlcs04F/JJ+5mFd2h/VgmGoxdyBozTrRNT+JKOfbnq\nKtBqyQSOrXIMFRzo3/iqJyzi4lA1eRm2E7t3rHKlgaSWku9HWoukX2WFfZSQlB2E\nF4oeAcaw7y4yQkhQ7mwIFN0kvg+b2FBBGexwla/EwohafaDToEbEHOZvSteadt/T\n5+q3oyUtAgMBAAECggEABwRGitWbSK4YYRpNlHi00q59IutQ8FodB+o+uMcI1t9m\nMrfz2CZ271IeLSqrEwBYmsBkKwBbuPiHvx+WKHb0dC7VqrD4ZgGPnkt8fzvNGkVD\nLFEtcxIdZ3ELpEYwJXOxBfrGSFsnG+OsaHnU5MAmLtFG1qiCOBq4ETzAh/YoY/Ft\noJQZaxYBIV5m2x/1AtWZQmLaIZiIziiVxIilH1FHlNN8lm8/1rP/Gag+KYJOuEO4\nXKRtoPi46fnTSBXBPA3C8aqaiEDVyof6oGGUERCw2lKCHGRVSWbZiGvMnU5T7awr\n4CYvU6rlYriUbWIg5AfB7+mg53RfpC+UJB0IKwVe/QKBgQD63dfYFmHGG53+m/+4\njNsrpBZs4Max6CqKUO8eokWTkvHCyac98xXp8AAupQa2mH74h968csmiv0Yhh4YW\n+RNdJ+rvHobAsclz18WCvlvNtE5k6gD5lSYrwOTk4MBd8KUwHSkvIdPyVvMF3IAt\nx5/X6tOdtbMEhKYsb2goQPRWTwKBgQC7VKmh1igcEP0AcFRB5Jid/mvHAS2/rAIM\n1wTz6Ft+Qglpxkc2i+51kkLPDXimvOtZdAcvURaI53xHFEIojIP8+tCfZbNFk5lj\nbY0nf91e+glJwJidja2Vr5jryXbfwkkkzwJ5DlnNNMn53EKBcLNHVTEVG5H9Vkc2\n2PwALzFpwwKBgQD5Hv5uduOHcPt30QCkCzTG5L7kRl7qYwyDqJWdDTYcs4rjjY9I\nJLK5Sn1T1MuS3mMQeRTGfRMhS+Lf/w44mAYTt0VFSkI07xiHsllQWase3pQPAJYR\nQ3zRbE+hvlMptoTD/+FbDbPE73WMd4jObXOdXnPhJIPu06+VZti/SKmbXwKBgQC3\npita3jGaOkleOcFQjAPWuEr+4Lfx9XZZEh7n4z53C9RgnyLHZe2T05ytkd5bUFBF\n9QrqJ0u5UX8zy7eEOyVWSKln6vMSXb39jLPaKm9ioiui4y57Hx8y5OA9H9frS3Qb\notogxaHiHEN6MaX9cfhAEVO6Brpbq07LhXOf1qRRswKBgQC2Vm+PmAE846BgB+Uv\n0uP2Tw5iuF0soeIdCkMvzR7Jwnml/04KN9pbExcSjX8draWlKhkG1CjppCUHNGt3\nZdNxXGxqJvA2kK7jpzTq2uDb2+JCFt5U+XEV06GNG5GaLQi1DfIyKTTgDEjC9yL0\nIPriwTGHs2tPhUllTKvOKG1rsg==\n-----END PRIVATE KEY-----\n",
      clientEmail: "firebase-adminsdk-fbsvc@stylus-dashboard-f6c70.iam.gserviceaccount.com"
    }),
  });

  console.log('Firebase Admin initialized successfully with project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes
};

async function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip rate limiting for now until proper implementation
    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next(error);
  }
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.sendStatus(403);
  next();
}

export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (req.user.role !== 'superadmin') return res.sendStatus(403);
  next();
}

export function isApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (!req.user.approved) return res.sendStatus(403);
  next();
}

function canModifyUser(requestingUser: any, targetUserId: number) {
  if (requestingUser.role === 'superadmin') {
    const targetUser = storage.getUser(targetUserId);
    if (targetUser && targetUser.role === 'superadmin' && requestingUser.id !== targetUserId) {
      return false;
    }
    return true;
  }

  if (requestingUser.role === 'admin') {
    const targetUser = storage.getUser(targetUserId);
    if (targetUser && targetUser.role === 'superadmin') return false;
    return true;
  }

  return requestingUser.id === targetUserId;
}

async function getClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0].split(',')[0].trim()
      : forwardedFor.split(',')[0].trim();
    console.log('Found forwarded IP:', ip, 'from x-forwarded-for:', forwardedFor);
    return ip;
  }

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

  console.log('Using direct IP:', req.ip);
  return req.ip;
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

  async function signInUser(req: Request, res: Response, user: any) {
    try {
      // Create a custom token for Firebase authentication
      const firebaseToken = await admin.auth().createCustomToken(user.id.toString(), {
        email: user.email,
        username: user.username
      });
      console.log('Firebase token created successfully');

      const clientIp = await getClientIp(req);
      const ipInfo = await getIpInfo(clientIp);
      const now = new Date();

      await storage.addLoginAttempt({
        identifier: user.username,
        ip: ipInfo.ip || clientIp,
        type: 'success',
        timestamp: now,
        isp: ipInfo.isp || null,
        city: ipInfo.city || null,
        region: ipInfo.region || null,
        country: ipInfo.country || null
      });

      await storage.updateUser({
        id: user.id,
        last_ip: ipInfo.ip || clientIp,
        last_login: now
      });

      return { firebaseToken, user };
    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
  }

  app.post("/api/login", checkRateLimit, async (req, res, next) => {
    try {
      const identifier = req.body.username;
      const clientIp = await getClientIp(req);

      console.log("Login attempt - IP:", clientIp, "Username:", identifier);

      passport.authenticate("local", async (err: any, user: any, info: any) => {
        if (err) return next(err);

        if (!user) {
          try {
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
          }
          return res.sendStatus(401);
        }

        req.logIn(user, async (err) => {
          if (err) return next(err);

          try {
            const { firebaseToken, user: signedInUser } = await signInUser(req, res, user);

            res.json({
              ...signedInUser,
              requires_password_change: user.temp_password,
              firebaseToken
            });
          } catch (error) {
            console.error('Error during login process:', error);
            res.status(500).json({ message: "Internal server error during login" });
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

        const template = await storage.getEmailTemplateByName("Password Reset"); //Added to get template
        await sendEmail({
          to: user.email,
          templateId: template?.id,
          templateData: {
            tempPassword,
            username: user.username,
            timestamp: new Date().toLocaleString(),
            appName: process.env.APP_NAME || 'Homelab Monitor',
            logoUrl: '/logo.png'
          }
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
      // Get the Admin Password Reset template
      const template = await storage.getEmailTemplateByName("Admin Password Reset");

      await sendEmail({
        to: user.email,
        templateId: template?.id,
        templateData: {
          tempPassword,
          username: user.username,
          timestamp: new Date().toLocaleString(),
          appName: process.env.APP_NAME || 'Homelab Monitor',
          logoUrl: '/logo.png'
        }
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

    if (!canModifyUser(req.user, targetUserId)) {
      return res.status(403).json({
        message: "Regular admins cannot modify superadmin users"
      });
    }

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

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        console.error('No token provided in request');
        return res.status(400).json({ message: "No token provided" });
      }

      const clientIp = await getClientIp(req);
      console.log('Attempting to verify Firebase token');

      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token)
        .catch(error => {
          console.error('Token verification failed:', error);
          throw error;
        });

      if (!decodedToken.email) {
        console.error('No email in decoded token:', decodedToken);

        try {
          const ipInfo = await getIpInfo(clientIp);
          await storage.addLoginAttempt({
            identifier: 'Unknown Google User',
            ip: ipInfo.ip || clientIp,
            type: 'failed',
            timestamp: new Date(),
            isp: ipInfo.isp || null,
            city: ipInfo.city || null,
            region: ipInfo.region || null,
            country: ipInfo.country || null
          });
        } catch (error) {
          console.error('Failed to record failed login attempt:', error);
        }

        return res.status(401).json({ message: "Invalid token: no email found" });
      }

      console.log('Token verified successfully for email:', decodedToken.email);

      let user = await storage.getUserByEmail(decodedToken.email);

      if (!user) {
        console.log('Creating new user for email:', decodedToken.email);
        const randomPassword = randomBytes(32).toString('hex');

        // Get default role from settings
        const settings = await storage.getSettings();
        const defaultRole = settings?.default_role || 'user';

        user = await storage.createUser({
          username: decodedToken.name || decodedToken.email.split('@')[0],
          email: decodedToken.email,
          password: await hashPassword(randomPassword),
          approved: false, // Set approved to false by default
          role: defaultRole
        });
      }

      // Check if user is approved
      if (!user.approved) {
        try {
          const ipInfo = await getIpInfo(clientIp);
          await storage.addLoginAttempt({
            identifier: decodedToken.email,
            ip: ipInfo.ip || clientIp,
            type: 'failed',
            timestamp: new Date(),
            isp: ipInfo.isp || null,
            city: ipInfo.city || null,
            region: ipInfo.region || null,
            country: ipInfo.country || null
          });
        } catch (error) {
          console.error('Failed to record failed login attempt:', error);
        }

        return res.status(403).json({
          message: "Account pending approval",
          requiresApproval: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            approved: false
          }
        });
      }

      req.login(user, async (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Error logging in" });
        }

        try {
          const ipInfo = await getIpInfo(clientIp);
          const now = new Date();

          await storage.addLoginAttempt({
            identifier: decodedToken.email,
            ip: ipInfo.ip || clientIp,
            type: 'success',
            timestamp: now,
            isp: ipInfo.isp || null,
            city: ipInfo.city || null,
            region: ipInfo.region || null,
            country: ipInfo.country || null
          });

          await storage.updateUser({
            id: user.id,
            last_ip: ipInfo.ip || clientIp,
            last_login: now // Add last_login update for Google auth
          });

        } catch (error) {
          console.error('Failed to record successful login attempt:', error);
        }

        res.json(user);
      });

    } catch (error) {
      console.error('Google auth error:', error);

      try {
        const clientIp = await getClientIp(req);
        const ipInfo = await getIpInfo(clientIp);
        await storage.addLoginAttempt({
          identifier: 'Unknown Google User',
          ip: ipInfo.ip || clientIp,
          type: 'failed',
          timestamp: new Date(),
          isp: ipInfo.isp || null,
          city: ipInfo.city || null,
          region: ipInfo.region || null,
          country: ipInfo.country || null
        });
      } catch (recordError) {
        console.error('Failed to record failed login attempt:', recordError);
      }

      res.status(401).json({
        message: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/auth/passkey/challenge", async (req, res) => {
    try {
      console.log('Received passkey challenge request');

      // Verify Firebase ID token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('No auth header found');
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(' ')[1];
      console.log('Verifying token...');

      const decodedToken = await admin.auth().verifyIdToken(token)
        .catch(error => {
          console.error('Token verification failed:', error);
          throw error;
        });

      console.log('Token verified successfully for uid:', decodedToken.uid);

      // Generate a random challenge
      const challenge = randomBytes(32);
      console.log('Generated challenge');

      res.json({
        challenge: Array.from(challenge),
        userId: decodedToken.uid
      });
    } catch (error) {
      console.error('Error in passkey challenge:', error);
      res.status(500).json({
        message: "Failed to generate challenge",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/auth/passkey/register", async (req, res) => {
    try {
      // Verify Firebase ID token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Get the credential from the request body
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "No credential provided" });
      }

      // Store the credential in Firebase
      await admin.auth().updateUser(decodedToken.uid, {
        multiFactor: {
          enrolledFactors: [{
            uid: randomBytes(16).toString('hex'),
            displayName: "Passkey",
            factorId: "webauthn",
            enrollmentTime: new Date().toISOString()
          }]
        }
      });

      res.json({ message: "Passkey registered successfully" });
    } catch (error) {
      console.error('Error registering passkey:', error);
      res.status(500).json({
        message: "Failed to register passkey",
        details: error instanceof Error ? error.message : "Unknown error"
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

async function generateHashForTest() {
  const password = "admin123";
  const hashedPassword = await hashPassword(password);
  console.log("Test hash generated for 'admin123':", hashedPassword);
  return hashedPassword;
}

async function createAdminUser(username: string, password: string, email: string) {
  try {
    const users = await storage.getAllUsers();
    const hasSuperAdmin = users.some(user => user.role === 'superadmin');

    if (hasSuperAdmin) {
      console.log("A superadmin already exists in the system, skipping admin creation");
      return null;
    }

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
  return template;
}
}