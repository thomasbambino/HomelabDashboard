import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { storage } from '../storage';
import { configureLocalStrategy } from './strategies/local';
import { configureFirebaseStrategy } from './firebase';

// Export the middleware
export {
  isAuthenticated, isApproved, isAdmin, isSuperAdmin, hasRole, isOwnerOrAdmin, rateLimit
} from './middleware';
export { hashPassword, verifyPassword, generateRandomPassword, isStrongPassword, getPasswordStrength } from './password';
export { getClientIp, recordLoginAttempt, shouldLockAccount, lockUserAccount, unlockUserAccount } from './utils/ip';
export { isRateLimited, resetRateLimit, rateLimitMiddleware } from './utils/rate-limit';
export { createUser, getUserById, getUserByUsernameOrEmail, getUsers, updateUser, deleteUser, countUsers } from './user';

/**
 * Initialize authentication for the app
 * 
 * @param app Express app
 * @param sessionSecret Session secret
 */
export function initAuth(app: express.Application, sessionSecret: string) {
  // Initialize passport
  app.use(passport.initialize());
  
  // Configure session
  const sessionMiddleware = session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    },
    store: new (require('connect-pg-simple')(session))({
      pool: storage.pool,
      tableName: 'sessions'
    })
  });
  
  // Use session middleware
  app.use(sessionMiddleware);
  
  // Setup session for passport
  app.use(passport.session());
  
  // Configure passport strategies
  configureLocalStrategy(passport);
  configureFirebaseStrategy(passport);
  
  return {
    passport,
    sessionMiddleware
  };
}