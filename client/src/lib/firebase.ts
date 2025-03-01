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

console.log('Initializing Firebase with config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '[REDACTED]' : undefined,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local
setPersistence(auth, browserLocalPersistence);

// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Passkey authentication helper
export async function signInWithPasskeyCredential() {
  try {
    // Use the PublicKeyCredential API directly
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname
      }
    }) as PublicKeyCredential;

    // Convert the credential to a format Firebase can use
    const authCredential = AuthCredential.fromJSON({
      providerId: 'passkey',
      signInMethod: 'passkey',
      credential: credential
    });

    const result = await signInWithCredential(auth, authCredential);
    return result;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'MultiFactor') {
      const mfaError = error as MultiFactorError;
      const resolver = getMultiFactorResolver(auth, mfaError);
      return resolver;
    }
    throw error;
  }
}

// Log auth state changes for debugging
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('Firebase Auth: User signed in', { email: user.email });
  } else {
    console.log('Firebase Auth: User signed out');
  }
});