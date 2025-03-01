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
  AuthCredential,
  updateProfile,
  multiFactor,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
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

// Passkey authentication helper using WebAuthn native API
export async function signInWithPasskeyCredential() {
  try {
    // Create options for getting the credential
    const options = {
      publicKey: {
        challenge: new Uint8Array([1, 2, 3, 4]), // In production, this should be a server-generated challenge
        allowCredentials: [],
        rpId: window.location.hostname,
        timeout: 60000,
        userVerification: "required" as UserVerificationRequirement,
      }
    };

    // Get the credential from the authenticator
    const credential = await navigator.credentials.get(options);

    if (!credential) {
      throw new Error("No credential returned");
    }

    // Send the credential to your backend for verification
    const response = await fetch('/api/auth/verify-passkey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: credential.id,
        type: credential.type,
        // Add any additional credential data needed for verification
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to verify passkey");
    }

    const { token } = await response.json();
    return { user: { getIdToken: async () => token } };

  } catch (error) {
    console.error('Passkey authentication error:', error);
    throw error;
  }
}

// Create passkey for current user
export async function createPasskey(displayName: string) {
  try {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to create a passkey");
    }

    // Create options for credential creation
    const options = {
      publicKey: {
        challenge: new Uint8Array([1, 2, 3, 4]), // In production, this should be a server-generated challenge
        rp: {
          name: 'Homelab Dashboard',
          id: window.location.hostname
        },
        user: {
          id: new Uint8Array(16), // Should be a stable identifier for the user
          name: auth.currentUser.email || displayName,
          displayName: displayName
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      }
    };

    // Create the credential
    const credential = await navigator.credentials.create(options);

    if (!credential) {
      throw new Error("Failed to create passkey");
    }

    // Register the credential with your backend
    const response = await fetch('/api/auth/register-passkey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          type: credential.type,
          // Add any additional credential data needed for registration
        },
        userId: auth.currentUser.uid
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to register passkey with server");
    }

    return true;

  } catch (error) {
    console.error('Error creating passkey:', error);
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