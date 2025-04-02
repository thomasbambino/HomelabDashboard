import passport from 'passport';
import { Strategy as CustomStrategy } from 'passport-custom';
import { storage } from '../storage';
import { Request } from 'express';
import { getClientIp, recordLoginAttempt } from './utils/ip';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if credentials are available
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.log('Firebase credentials not found, Firebase authentication will not be available');
  }
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error);
}

/**
 * Configure Firebase authentication strategy for Passport
 * 
 * @param passport Passport instance
 */
export function configureFirebaseStrategy(passport: passport.PassportStatic): void {
  if (!firebaseInitialized) {
    console.log('Firebase authentication not configured, skipping');
    return;
  }
  
  passport.use('firebase', new CustomStrategy(async (req: Request, done) => {
    try {
      // Get authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return done(null, false, { message: 'No authorization token provided' });
      }
      
      // Extract token from header
      const token = authHeader.split('Bearer ')[1];
      if (!token) {
        return done(null, false, { message: 'Invalid authorization format' });
      }
      
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (!decodedToken) {
        return done(null, false, { message: 'Invalid token' });
      }
      
      // Get Firebase user info
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);
      
      // Get the client IP for login tracking
      const ip = await getClientIp(req);
      
      // Find user by email
      let user = await storage.getUserByEmail(firebaseUser.email || '');
      
      if (!user) {
        // User doesn't exist yet, create a new user
        user = await storage.createUser({
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || decodedToken.uid,
          email: firebaseUser.email || `firebase-${decodedToken.uid}@example.com`,
          passwordHash: '',  // Firebase users don't have a local password
          role: 'pending',
          approved: false,
          locked: false,
          firebaseUid: decodedToken.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLogin: new Date()
        });
        
        // Record successful login
        await recordLoginAttempt(ip, user.id, user.email, true);
        
        return done(null, user);
      }
      
      // Update user's Firebase UID if not already set
      if (!user.firebaseUid) {
        await storage.updateUser(user.id, {
          firebaseUid: decodedToken.uid,
          updatedAt: new Date()
        });
      }
      
      // Check if user is locked
      if (user.locked) {
        await recordLoginAttempt(ip, user.id, user.email, false);
        return done(null, false, { message: 'Account is locked. Please contact an administrator.' });
      }
      
      // Update last login time
      await storage.updateUser(user.id, {
        lastLogin: new Date(),
        updatedAt: new Date()
      });
      
      // Record successful login
      await recordLoginAttempt(ip, user.id, user.email, true);
      
      // Authentication successful
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