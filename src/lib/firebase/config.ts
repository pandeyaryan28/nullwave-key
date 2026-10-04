import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkX1otIV2_jKn7FpvARV-ErJAJP9ikkQ4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unlockr-ap28-2026.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "unlockr-ap28-2026",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "unlockr-ap28-2026.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "363961432336",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:363961432336:web:843736186c76fb82fe4d95",
};

// Initialize Firebase once
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
