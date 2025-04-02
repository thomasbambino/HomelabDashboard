import passport from 'passport';
import { Strategy as CustomStrategy } from 'passport-custom';
import { storage } from '../storage';
import * as userUtils from './user';
import { getClientIp, recordLoginAttempt } from './utils/ip';
import * as firebase from 'firebase-admin';

// Firebase Admin SDK initialized elsewhere if available
let firebaseInitialized = false;

try {
  if (firebase && process.env.FIREBASE_CREDENTIALS) {
    firebaseInitialized = true;
  }
} catch (error) {
  console.log('Firebase Admin SDK not available');
}

/**
 * Configure Firebase authentication strategy for Passport
 * 
 * @param passport Passport instance
 */
export function configureFirebaseStrategy(passport: passport.PassportStatic): void {
  passport.use('firebase', new CustomStrategy(async (req, done) => {
    try {
      // Get the client IP for rate limiting and logging
      const ip = await getClientIp(req);
      
      // Get token from request
      const idToken = req.body.idToken || req.headers.authorization?.split('Bearer ')[1];
      
      if (!idToken) {
        return done(null, false, { message: 'No Firebase token provided' });
      }
      
      if (!firebaseInitialized) {
        return done(null, false, { message: 'Firebase authentication is not configured' });
      }
      
      // Verify Firebase token
      const decodedToken = await firebase.auth().verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;
      
      if (!email) {
        return done(null, false, { message: 'No email associated with Firebase account' });
      }
      
      // Find or create user
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // Check if a user with this email already exists
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Link existing account with Firebase
          user = await storage.updateUser(user.id, {
            firebaseUid,
            updatedAt: new Date()
          });
        } else {
          // Create new user
          const displayName = decodedToken.name || '';
          const nameParts = displayName.split(' ');
          const username = (decodedToken.email || '').split('@')[0];
          
          user = await userUtils.createUser({
            username: username,
            email: email,
            role: 'pending', // New users start as pending until approved
            approved: false,
            firebaseUid: firebaseUid,
            displayName: displayName,
            firstName: nameParts[0] || null,
            lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null
          });
        }
      }
      
      // Check if user is locked
      if (user.locked) {
        await recordLoginAttempt(ip, user.id, email, false);
        return done(null, false, { message: 'Account is locked. Please contact an administrator.' });
      }
      
      // Update last login
      await storage.updateUser(user.id, {
        lastLogin: new Date(),
        updatedAt: new Date()
      });
      
      // Record successful login
      await recordLoginAttempt(ip, user.id, email, true);
      
      return done(null, user);
    } catch (error) {
      console.error('Firebase authentication error:', error);
      return done(error);
    }
  }));
}

/**
 * Check if Firebase authentication is available
 * 
 * @returns True if Firebase authentication is available
 */
export function isFirebaseAvailable(): boolean {
  return firebaseInitialized;
}