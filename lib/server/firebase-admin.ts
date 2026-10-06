import "server-only"
import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"

// Credentials are read ONLY from server-side env vars (never NEXT_PUBLIC_*).
// Supported forms, checked in order:
//   FIREBASE_SERVICE_ACCOUNT_KEY  - the full service-account JSON (raw or base64)
//   FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ NEXT_PUBLIC_FIREBASE_PROJECT_ID)
function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (raw) {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")
    const parsed = JSON.parse(json) as { project_id: string; client_email: string; private_key: string }
    return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key }
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (clientEmail && privateKey && projectId) return { projectId, clientEmail, privateKey }
  return null
}

export function isAdminConfigured() {
  try {
    return readServiceAccount() !== null
  } catch {
    return false
  }
}

export class AdminNotConfiguredError extends Error {
  constructor() {
    super(
      "Server credentials are not configured. Add FIREBASE_SERVICE_ACCOUNT_KEY in project settings → Vars to enable trusted grading, certificates and notifications.",
    )
  }
}

function adminApp(): App {
  if (getApps().length) return getApp()
  const account = readServiceAccount()
  if (!account) throw new AdminNotConfiguredError()
  return initializeApp({
    credential: cert(account),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

export const adminAuth = () => getAuth(adminApp())
export const adminDb = () => getFirestore(adminApp())
export const adminMessaging = () => getMessaging(adminApp())
