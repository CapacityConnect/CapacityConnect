import "server-only"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { HttpError, handleRouteError, requireUser } from "@/lib/server/session"
import { notifyUsers } from "@/lib/server/notify"
import type { AppUser } from "@/lib/types"

/**
 * Admin-only. Updates the pending user's status and notifies them in one
 * trusted call (notification documents can't be created client-side).
 */
export async function POST(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireUser(req, { roles: ["admin"] })
    const { uid } = await params
    const body = await req.json().catch(() => ({}))
    const decision = body?.decision === "approved" || body?.decision === "rejected" ? body.decision : null
    if (!decision) throw new HttpError(400, "decision must be 'approved' or 'rejected'.")

    const db = adminDb()
    const ref = db.collection("users").doc(uid)
    const snap = await ref.get()
    if (!snap.exists) throw new HttpError(404, "User not found.")
    const target = snap.data() as AppUser
    if (target.status !== "pending") throw new HttpError(409, "This account is not pending approval.")

    await ref.update({ status: decision })

    await notifyUsers({
      userIds: [uid],
      type: "approval",
      title: decision === "approved" ? "Account approved" : "Account not approved",
      message:
        decision === "approved"
          ? "Your account has been approved. You now have full access."
          : "Your account request was not approved. Contact an administrator for details.",
      email: true,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
