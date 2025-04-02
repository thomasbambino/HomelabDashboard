import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { storage } from '../storage';
import { setupLocalStrategy, setupPassportSerialization } from './strategies/local';
import { configureFirebaseStrategy } from './firebase';

// Export all the authorization components
export * from './middleware';
export * from './password';
export * from './utils/ip';
export * from './utils/rate-limit';
export * from './user';

// Session store for Express session
const MemoryStore = require('memorystore')(session);

/**
 * Configure authentication for the application
 * 
 * @param app Express application
 */
export function configureAuth(app: express.Express): void {
  // Configure Express session
  app.use(session({
    secret: process.env.SESSION_SECRET || 'homelab-dashboard-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // 24 hours (prune expired entries)
    })
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Passport to serialize and deserialize users
  setupPassportSerialization();
  
  // Configure Passport authentication strategies
  setupLocalStrategy();
  
  // Configure Firebase authentication if FIREBASE_CONFIG is set
  if (process.env.FIREBASE_CONFIG) {
    try {
      configureFirebaseStrategy();
    } catch (error) {
      console.error('Failed to configure Firebase authentication:', error);
    }
  }
}

/**
 * Create initial admin user if none exists
 * This is typically called when the application starts
 */
export async function createInitialAdmin(): Promise<void> {
  try {
    const { createAdminIfNoneExists } = await import('./user');
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    
    if (adminEmail && adminPassword) {
      const admin = await createAdminIfNoneExists(adminEmail, adminPassword, adminUsername);
      
      if (admin) {
        console.log(`Created initial admin user: ${adminEmail}`);
      }
    }
  } catch (error) {
    console.error('Failed to create initial admin user:', error);
  }
}