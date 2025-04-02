import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { storage } from '../storage';
import { setupLocalStrategy } from './strategies/local';
import { initializeFirebase, verifyFirebaseToken } from './firebase';

// Export middleware and utilities
export * from './middleware';
export * from './password';
export * from './utils/ip';
export * from './utils/rate-limit';
export * from './user';

/**
 * Initialize authentication for the app
 * Sets up passport and session handling
 * 
 * @param app Express app
 */
export function initializeAuth(app: express.Express): void {
  // Configure session storage
  const sessionStore = storage.createSessionStore(session);
  
  // Configure session middleware
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Set up local strategy for username/password
  setupLocalStrategy();
  
  // Initialize Firebase auth if configured
  if (initializeFirebase()) {
    // If Firebase is initialized, add the verification middleware
    app.use(verifyFirebaseToken());
  }
  
  // Expose whether user is authenticated
  app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated && req.isAuthenticated();
    next();
  });
}

/**
 * Get the current user's information
 * 
 * @param req Express request
 * @returns User object or null
 */
export function getCurrentUser(req: express.Request): any {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return req.user;
  }
  
  // Check if the user is authenticated via Firebase
  if ((req as any).firebaseUser) {
    return (req as any).firebaseUser;
  }
  
  return null;
}

/**
 * Check if the current user has a specific role
 * 
 * @param req Express request
 * @param role Role to check for
 * @returns Whether the user has the role
 */
export function hasRole(req: express.Request, role: string): boolean {
  const user = getCurrentUser(req);
  if (!user) {
    return false;
  }
  
  return user.role === role;
}

/**
 * Check if the current user has one of the specified roles
 * 
 * @param req Express request
 * @param roles Roles to check for
 * @returns Whether the user has one of the roles
 */
export function hasAnyRole(req: express.Request, roles: string[]): boolean {
  const user = getCurrentUser(req);
  if (!user) {
    return false;
  }
  
  return roles.includes(user.role);
}