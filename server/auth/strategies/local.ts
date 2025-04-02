import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { storage } from '../../storage';
import { verifyPassword } from '../password';
import { getClientIp } from '../utils/ip';
import { loginRateLimit } from '../utils/rate-limit';

/**
 * Set up local authentication strategy with Passport
 */
export function setupLocalStrategy() {
  // Set up LocalStrategy for username/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true,
      },
      async (req, username, password, done) => {
        try {
          // Check for empty username or password
          if (!username || !password) {
            return done(null, false, { message: 'Missing username or password' });
          }
          
          // Get user from database
          const user = await storage.getUserByUsernameOrEmail(username);
          
          // Check if user exists
          if (!user) {
            console.warn(`Failed login attempt: User ${username} not found, IP: ${await getClientIp(req)}`);
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // Check if user is locked
          if (user.locked) {
            console.warn(`Failed login attempt: Locked user ${username}, IP: ${await getClientIp(req)}`);
            return done(null, false, { message: 'Account is locked' });
          }
          
          // Check if user is approved
          if (!user.approved) {
            console.warn(`Failed login attempt: Unapproved user ${username}, IP: ${await getClientIp(req)}`);
            return done(null, false, { message: 'Account is pending approval' });
          }
          
          // Check password
          const isValid = await verifyPassword(password, user.passwordHash);
          
          if (!isValid) {
            console.warn(`Failed login attempt: Invalid password for ${username}, IP: ${await getClientIp(req)}`);
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // Update last login time
          await storage.updateUser(user.id, {
            lastLogin: new Date()
          });
          
          // Return authenticated user
          return done(null, user);
        } catch (error) {
          console.error('Error in local strategy:', error);
          return done(error);
        }
      }
    )
  );
  
  // Serialization and deserialization for session storage
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      
      if (!user) {
        return done(null, false);
      }
      
      // Filter out sensitive information
      const safeUser = {
        ...user,
        passwordHash: undefined
      };
      
      return done(null, safeUser);
    } catch (error) {
      return done(error);
    }
  });
}