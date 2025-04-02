import { Strategy as LocalStrategy } from 'passport-local';
import passport from 'passport';
import { storage } from '../../storage';
import { verifyPassword, needsRehash } from '../password';
import { getClientIp, trackLoginIp, isSuspiciousIp } from '../utils/ip';
import { isRateLimited, resetRateLimit, addRateLimitEntry } from '../utils/rate-limit';

/**
 * Configure passport with local username/password authentication strategy
 */
export function setupLocalStrategy(): void {
  // Configure the local strategy for use by Passport
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true
      },
      async (req, username, password, done) => {
        try {
          // Get client IP address
          const ip = await getClientIp(req);
          
          // Check if IP is rate limited for login attempts
          if (isRateLimited('login', ip)) {
            return done(null, false, {
              message: 'Too many login attempts. Please try again later.'
            });
          }
          
          // Check if IP has suspicious activity
          const suspicious = await isSuspiciousIp(ip);
          if (suspicious) {
            // Still allow login but log the attempt for review
            console.warn(`Suspicious login attempt from IP: ${ip}`);
          }
          
          // Find the user by username (case insensitive)
          let user = await storage.getUserByUsername(username);
          
          // If not found by username, try email (also case insensitive)
          if (!user) {
            user = await storage.getUserByEmail(username.toLowerCase());
          }
          
          // Add a rate limit entry regardless of success or failure
          // This prevents timing attacks that could determine if a username exists
          addRateLimitEntry('login', ip);
          
          // User not found
          if (!user) {
            await trackLoginIp(0, ip, false);
            return done(null, false, { message: 'Incorrect username or password' });
          }
          
          // Account is locked
          if (user.locked) {
            await trackLoginIp(user.id, ip, false);
            return done(null, false, { message: 'Account is locked. Please contact an administrator.' });
          }
          
          // Verify password
          const isValid = await verifyPassword(password, user.passwordHash);
          
          if (!isValid) {
            // Failed login - increment failed login attempts
            const failedAttempts = (user.failedLoginAttempts || 0) + 1;
            
            // Update user with failed login attempt
            await storage.updateUser(user.id, {
              failedLoginAttempts: failedAttempts,
              // Auto-lock account after too many failures
              locked: failedAttempts >= 10
            });
            
            // Track failed login
            await trackLoginIp(user.id, ip, false);
            
            return done(null, false, { message: 'Incorrect username or password' });
          }
          
          // Check if password needs to be rehashed with a stronger algorithm
          const newHash = await needsRehash(password, user.passwordHash);
          if (newHash) {
            await storage.updateUser(user.id, { passwordHash: newHash });
          }
          
          // Successful login - reset failed login attempts and update last login
          await storage.updateUser(user.id, {
            failedLoginAttempts: 0,
            lastLogin: new Date()
          });
          
          // Track successful login
          await trackLoginIp(user.id, ip, true);
          
          // Reset rate limit for this IP on successful login
          resetRateLimit('login', ip);
          
          // Return the user
          return done(null, user);
        } catch (error) {
          console.error('Error in local authentication strategy:', error);
          return done(error);
        }
      }
    )
  );
}

/**
 * Configure passport serialization/deserialization for session management
 */
export function setupPassportSerialization(): void {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      
      if (!user) {
        return done(null, false);
      }
      
      // Check if user account is locked
      if (user.locked) {
        return done(null, false);
      }
      
      // Remove sensitive data before returning user
      delete user.passwordHash;
      delete user.resetToken;
      delete user.resetTokenSignature;
      delete user.resetTokenExpires;
      
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}