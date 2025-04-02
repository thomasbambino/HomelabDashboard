import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { storage } from '../storage';

// Check if Firebase credentials are available
let firebaseInitialized = false;

/**
 * Interface for Firebase authenticated request
 */
interface AuthenticatedRequest extends Request {
  firebaseUser?: any;
}

/**
 * Initialize Firebase Admin SDK
 * 
 * @returns Whether Firebase was successfully initialized
 */
export function initializeFirebase(): boolean {
  try {
    // Check if we have the required environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (!privateKey || !clientEmail || !projectId) {
      console.warn('Firebase credentials not found in environment variables');
      return false;
    }
    
    // Initialize the app if it hasn't been initialized already
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
    }
    
    firebaseInitialized = true;
    console.log('Firebase authentication initialized');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return false;
  }
}

/**
 * Middleware to verify Firebase ID token from the request
 * 
 * @returns Express middleware
 */
export function verifyFirebaseToken() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!firebaseInitialized) {
      return next();
    }
    
    const authRequest = req as AuthenticatedRequest;
    
    // Skip token verification if already authenticated via session
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    // Extract token
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return next();
    }
    
    try {
      // Verify token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get or create user in our database
      let user = await storage.getUserByFirebaseId(decodedToken.uid);
      
      if (!user) {
        // Create a new user record in our database
        const email = decodedToken.email || `firebase-user-${decodedToken.uid}@example.com`;
        const displayName = decodedToken.name || decodedToken.email || `Firebase User ${decodedToken.uid.slice(0, 6)}`;
        
        user = await storage.createUser({
          username: email,
          email,
          passwordHash: 'firebase-auth', // Not used for authentication
          displayName,
          role: 'user',
          approved: true, // Auto-approve Firebase users
          created: new Date(),
          lastLogin: new Date(),
          locked: false,
          firebaseId: decodedToken.uid
        });
      } else {
        // Update last login time
        await storage.updateUser(user.id, {
          lastLogin: new Date()
        });
      }
      
      // Attach the user to the request
      authRequest.firebaseUser = user;
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
    }
    
    next();
  };
}

/**
 * Check if a user is authenticated via Firebase
 * 
 * @param req Express request
 * @returns Whether the user is authenticated
 */
export function isFirebaseAuthenticated(req: Request): boolean {
  return !!(req as AuthenticatedRequest).firebaseUser;
}