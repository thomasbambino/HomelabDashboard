import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  setPersistence,
  signInWithCredential,
  getMultiFactorResolver,
  MultiFactorError,
  AuthCredential
} from 'firebase/auth';

// Verify Firebase configuration values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: undefined
};

// Validate required config values
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error('Missing required Firebase configuration values:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId
  });
  throw new Error('Firebase configuration is incomplete');
}

console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local and wait for it to complete
await setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase persistence set to local');
  })
  .catch(error => {
    console.error('Error setting auth persistence:', error);
  });

// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Log auth state changes for debugging
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('Firebase Auth: User signed in', { 
      email: user.email,
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      providerId: user.providerId
    });
  } else {
    console.log('Firebase Auth: User signed out');
  }
});