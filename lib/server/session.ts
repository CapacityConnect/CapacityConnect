import "server-only"
import { NextResponse } from "next/server"
import type { AppUser, Role } from "@/lib/types"
import { AdminNotConfiguredError, adminAuth, adminDb } from "@/lib/server/firebase-admin"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Verifies the Firebase ID token in the Authorization header and loads the caller's profile. */
export async function requireUser(req: Request, opts: { roles?: Role[]; allowPending?: boolean } = {}) {
  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) throw new HttpError(401, "Missing auth token.")

  let uid: string
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid
  } catch (err) {
    if (err instanceof AdminNotConfiguredError) throw err
    throw new HttpError(401, "Invalid or expired session.")
  }

  const snap = await adminDb().collection("users").doc(uid).get()
  if (!snap.exists) throw new HttpError(403, "No profile for this account.")
  const user = snap.data() as AppUser

  if (!opts.allowPending && user.status !== "approved") throw new HttpError(403, "Account is not approved.")
  if (opts.roles && !opts.roles.includes(user.role)) throw new HttpError(403, "Not allowed for your role.")
  return user
}

export function handleRouteError(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status })
  if (err instanceof AdminNotConfiguredError)
    return NextResponse.json({ error: err.message, code: "admin-not-configured" }, { status: 503 })
  console.error("[v0] route error:", err)
  return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 })
}
