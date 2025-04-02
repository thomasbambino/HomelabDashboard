import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { storage } from '../../storage';
import { verifyPassword, needsRehash } from '../password';
import { getClientIp, recordLoginAttempt, isLoginBlocked } from '../utils/ip';
import { isRateLimited } from '../utils/rate-limit';

/**
 * Configure local username/password authentication strategy for Passport
 * 
 * @param passport Passport instance
 */
export function configureLocalStrategy(passport: passport.PassportStatic): void {
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
    async (req, email, password, done) => {
      try {
        // Get the client IP for rate limiting
        const ip = await getClientIp(req);
        
        // Check if login attempts are blocked for this IP or email
        if (await isLoginBlocked(ip, email)) {
          // Record failed login attempt
          await recordLoginAttempt(ip, null, email, false);
          
          return done(null, false, {
            message: 'Too many failed login attempts. Please try again later.'
          });
        }
        
        // Find user by email
        const user = await storage.getUserByEmail(email);
        
        // User not found
        if (!user) {
          // Record failed login attempt
          await recordLoginAttempt(ip, null, email, false);
          
          return done(null, false, {
            message: 'Invalid email or password'
          });
        }
        
        // Check if user is locked
        if (user.locked) {
          await recordLoginAttempt(ip, user.id, email, false);
          return done(null, false, {
            message: 'Account is locked. Please contact an administrator.'
          });
        }
        
        // Check if the password is correct
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        
        if (!isValidPassword) {
          // Record failed login attempt
          await recordLoginAttempt(ip, user.id, email, false);
          
          return done(null, false, {
            message: 'Invalid email or password'
          });
        }
        
        // Check if password hash needs upgrading to a better algorithm
        const newHash = await needsRehash(password, user.passwordHash);
        if (newHash) {
          // Update password hash with better algorithm
          await storage.updateUserPasswordHash(user.id, newHash);
        }
        
        // Update last login time
        await storage.updateUser(user.id, {
          lastLogin: new Date(),
          updatedAt: new Date()
        });
        
        // Record successful login
        await recordLoginAttempt(ip, user.id, email, true);
        
        // Authentication successful
        return done(null, user);
      } catch (error) {
        console.error('Local authentication error:', error);
        return done(error);
      }
    }
  ));
}