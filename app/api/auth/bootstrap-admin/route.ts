import "server-only"
import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import { handleRouteError, HttpError } from "@/lib/server/session"
import type { AppUser } from "@/lib/types"

const DEMO_PASSWORD = "Demo@123"
const DEMO_ACCOUNTS: Array<{ email: string; name: string; role: AppUser["role"] }> = [
  { email: "admin@capacityconnect.demo", name: "Platform Admin", role: "admin" },
  { email: "trainer@capacityconnect.demo", name: "Dr. Ananya Rao", role: "trainer" },
  { email: "trainee@capacityconnect.demo", name: "Sam Trainee", role: "trainee" },
]

/**
 * One-time setup endpoint. Creates the platform's first admin (plus the demo
 * trainer/trainee accounts shown on the login page) with the Admin SDK, which
 * bypasses the client rule that blocks self-assigning the admin role.
 *
 * Locked shut the moment any admin account exists, so it can only ever
 * bootstrap — never be used to mint additional admins later. If
 * ADMIN_BOOTSTRAP_SECRET is set, the caller must also supply it.
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET
    if (secret) {
      const provided = req.headers.get("x-bootstrap-secret")
      if (provided !== secret) throw new HttpError(401, "Invalid bootstrap secret.")
    }

    const db = adminDb()
    const existingAdmin = await db.collection("users").where("role", "==", "admin").limit(1).get()
    if (!existingAdmin.empty) {
      throw new HttpError(409, "An admin account already exists. Sign in instead.")
    }

    const auth = adminAuth()
    const created: Array<{ email: string; role: string }> = []

    for (const account of DEMO_ACCOUNTS) {
      let uid: string
      try {
        const existingUser = await auth.getUserByEmail(account.email)
        uid = existingUser.uid
        await auth.updateUser(uid, { password: DEMO_PASSWORD, displayName: account.name })
      } catch {
        const newUser = await auth.createUser({
          email: account.email,
          password: DEMO_PASSWORD,
          displayName: account.name,
        })
        uid = newUser.uid
      }

      const userDoc: AppUser = {
        uid,
        name: account.name,
        email: account.email,
        role: account.role,
        status: "approved",
        organization: "Capacity Connect",
        designation: account.role === "trainer" ? "Lead Trainer" : account.role === "admin" ? "Administrator" : "Trainee",
        expertise: account.role === "trainer" ? ["Data Analysis"] : [],
        createdAt: Date.now(),
      }
      await db.collection("users").doc(uid).set(userDoc, { merge: true })
      created.push({ email: account.email, role: account.role })
    }

    return NextResponse.json({ ok: true, created })
  } catch (err) {
    return handleRouteError(err)
  }
}
