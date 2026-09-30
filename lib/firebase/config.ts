import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Centralized Firebase configuration. All values come from public env vars
// injected by the Vercel/Firebase integration. Never hardcode secrets here.
export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
)

// Syntactically valid placeholder used ONLY when real env vars are absent
// (e.g. static build/prerender of pages that don't actually touch Firebase).
// This prevents `next build` from crashing with auth/invalid-api-key before
// the real NEXT_PUBLIC_FIREBASE_* vars are configured in Vercel. It is never
// used for real auth/data because every real flow requires the actual keys
// to work at runtime.
const firebaseConfig = isFirebaseConfigured
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  : {
      // Must resemble a real Firebase Web API key (AIza... 39 chars) or the
      // Auth SDK throws auth/invalid-api-key synchronously at getAuth() time.
      apiKey: "AIzaSyDemoKeyNotConfigured000000000000",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo-project-not-configured",
      storageBucket: "demo.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000",
    }

if (!isFirebaseConfigured && typeof window !== "undefined") {
  console.error(
    "[firebase] NEXT_PUBLIC_FIREBASE_* environment variables are not set. Auth, Firestore and Storage will not work until they are configured in Project Settings → Vars.",
  )
}

function createFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp()
  return initializeApp(firebaseConfig)
}

export const firebaseApp = createFirebaseApp()
export const auth: Auth = getAuth(firebaseApp)
export const db: Firestore = getFirestore(firebaseApp)
export const storage: FirebaseStorage = getStorage(firebaseApp)
