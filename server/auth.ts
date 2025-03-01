import admin from 'firebase-admin';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User as SelectUser } from "@shared/schema.js";
import { sendEmail } from "./email.js";
import { getIpInfo } from './utils/ip.js';

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
      clientEmail: `firebase-adminsdk-${process.env.VITE_FIREBASE_PROJECT_ID}@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
  });

  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes
};

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
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
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

async function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  const identifier = req.body.username;
  const ip = req.ip;
  const type = 'login';

  try {
    const attempts = await storage.getLoginAttemptsInWindow(identifier, ip, type, RATE_LIMIT.WINDOW_MS);
    console.log('Rate limit check - attempts:', attempts);

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

      await storage.clearLoginAttempts(identifier, ip, type);
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next(error);
  }
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as SelectUser;
  if (user.role !== 'admin' && user.role !== 'superadmin') return res.sendStatus(403);
  next();
}

export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as SelectUser;
  if (user.role !== 'superadmin') return res.sendStatus(403);
  next();
}

export function isApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as SelectUser;
  if (!user.approved) return res.sendStatus(403);
  next();
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
          console.log("No user found with username:", username);
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

        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user: SelectUser, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Basic authentication endpoints
  app.post("/api/login", checkRateLimit, async (req, res, next) => {
    try {
      passport.authenticate("local", async (err: any, user: SelectUser | false) => {
        if (err) return next(err);

        if (!user) {
          return res.sendStatus(401);
        }

        req.login(user, async (err) => {
          if (err) return next(err);
          res.json({
            ...user,
            requires_password_change: user.temp_password
          });
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