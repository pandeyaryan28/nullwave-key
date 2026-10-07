import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.[key]) {
    return (import.meta as unknown as { env: Record<string, string> }).env[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key]!;
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || 'mock-api-key-for-test-environments',
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || 'unlockr-ap28-2026.firebaseapp.com',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || 'unlockr-ap28-2026',
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || 'unlockr-ap28-2026.firebasestorage.app',
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || '363961432336',
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || '1:363961432336:web:843736186c76fb82fe4d95',
};

// Initialize Firebase once
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
