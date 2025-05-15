import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_apiKey,
  authDomain: import.meta.env.VITE_authDomain,
  projectId: import.meta.env.VITE_projectId,
  storageBucket: import.meta.env.VITE_storageBucket,
  messagingSenderId: import.meta.env.VITE_messagingSenderId,
  appId: import.meta.env.VITE_appId,
  measurementId: import.meta.env.VITE_measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check in production
// if (import.meta.env.PROD) {
//   // In production, use the real reCAPTCHA provider
//   initializeAppCheck(app, {
//     provider: new ReCaptchaV3Provider(import.meta.env.VITE_recaptchaSiteKey || 'dummy-key'),
//     isTokenAutoRefreshEnabled: true
//   });
// }

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Use session persistence for better security (clears on browser close)
// This prevents long-lived tokens from being stored in localStorage
setPersistence(auth, browserSessionPersistence).catch(error => {
  console.error('Error setting auth persistence:', error);
});

// Connect to emulators in development only if VITE_USE_EMULATORS is set to 'true'
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    if (window.location.hostname === 'localhost') {
      console.log('Connecting to Firebase emulators...');
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('Successfully connected to Firebase emulators');
    }
  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
  }
}

export { auth, db, functions, storage };