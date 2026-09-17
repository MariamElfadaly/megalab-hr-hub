// Firebase initialization for the NEW merged-app project.
// Values come from environment variables (.env, see .env.example) —
// same pattern hr-timeline-tracker already uses. Vite bakes VITE_ vars
// into the built JS bundle; that's fine for Firebase web config, since
// real protection comes from Firestore Security Rules + Authorized
// Domains + API key restrictions, not from hiding this file.
//
// STATUS: placeholder values below. Once Mariam sends the real
// firebaseConfig from the new Firebase project's web-app registration,
// drop it into .env (see .env.example) — nothing in this file needs to
// change.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
