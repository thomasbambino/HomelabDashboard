import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { storage } from "../storage";
import { hashPassword, generateTemporaryPassword } from "./password";
import { getClientIp, getIpInfo } from "./utils/ip";
import { checkRateLimit } from "./utils/rate-limit";
import { isAdmin, canModifyUser, isSuperAdmin } from "./middleware";
import { sendEmail } from "../email";

const router = Router();

/**
 * Register a new user
 */
router.post("/register", async (req, res, next) => {
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

  try {
    const user = await storage.createUser({
      ...req.body,
      email,
      password: await hashPassword(password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

/**
 * Log in an existing user
 */
router.post("/login", checkRateLimit, async (req, res, next) => {
  try {
    const identifier = req.body.username;
    const clientIp = await getClientIp(req);
    const type = 'login';

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
          await storage.addLoginAttempt({
            identifier,
            ip: clientIp,
            type: 'failed',
            timestamp: new Date()
          });
        }

        return res.sendStatus(401);
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) return next(loginErr);

        try {
          const ipInfo = await getIpInfo(clientIp);
          const now = new Date();

          await storage.addLoginAttempt({
            identifier,
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

          res.json({
            ...user,
            requires_password_change: user.temp_password
          });
        } catch (error) {
          console.error('Failed to update user IP with geolocation:', error);
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

/**
 * Change user's password
 */
router.post("/change-password", async (req, res) => {
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

/**
 * Request a password reset
 */
router.post("/request-reset", checkRateLimit, async (req, res) => {
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
      const tempPassword = generateTemporaryPassword();

      await storage.updateUser({
        id: user.id,
        password: await hashPassword(tempPassword),
        temp_password: true
      });

      const template = await storage.getEmailTemplateByName("Password Reset");
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

/**
 * Log out the current user
 */
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

/**
 * Get the current authenticated user
 */
router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  res.json(req.user);
});

/**
 * Admin: Reset a user's password
 */
router.post("/admin/reset-user-password", isAdmin, async (req, res) => {
  const { userId } = req.body;
  const user = await storage.getUser(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const tempPassword = generateTemporaryPassword();

  await storage.updateUser({
    id: user.id,
    password: await hashPassword(tempPassword),
    temp_password: true
  });

  if (user.email) {
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

// Export the router
export default router;