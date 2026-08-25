import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBPOeXPgVJ4ukUCg7tPU8Iy6nkK2EMGeYs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "subscription-free-681aa.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://subscription-free-681aa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "subscription-free-681aa",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "subscription-free-681aa.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1022409104304",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1022409104304:web:23ec31c812882a90265475"
}

export const isFirebaseConfigured = Object.values(config).every(Boolean)
const app = isFirebaseConfigured ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
