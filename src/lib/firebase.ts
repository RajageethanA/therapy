import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Vite exposes env vars prefixed with VITE_ via import.meta.env
const firebaseConfig = {
  apiKey: "AIzaSyDdzx9ynfOExOD4EW_HZAMquUO-187SuMs",
  authDomain: "therapist-cc654.firebaseapp.com",
  projectId: "therapist-cc654",
  storageBucket: "therapist-cc654.firebasestorage.app",
  messagingSenderId: "558739956587",
  appId: "1:558739956587:web:1ca35fab815b72ad9ae22e",
  measurementId: "G-CTZKQX6M25"
};

let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  // initializeApp will throw if called multiple times in HMR; ignore in that case
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore
  app = (globalThis as any).__firebase_app || initializeApp(firebaseConfig);
  // store for HMR to reuse
  // @ts-ignore
  (globalThis as any).__firebase_app = app;
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
