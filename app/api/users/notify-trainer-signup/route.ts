import "server-only"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { handleRouteError, requireUser } from "@/lib/server/session"
import { notifyUsers } from "@/lib/server/notify"

/**
 * Called once, right after a trainer account is created. Only lets a caller
 * announce their *own* pending trainer application (checked server-side
 * against their own user doc, not client input), so this can't be abused to
 * spam arbitrary notifications.
 */
export async function POST(req: Request) {
  try {
    const caller = await requireUser(req, { allowPending: true })
    if (caller.role !== "trainer" || caller.status !== "pending") {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const db = adminDb()
    const adminsSnap = await db.collection("users").where("role", "==", "admin").get()
    const adminIds = adminsSnap.docs.map((d) => d.id)

    await notifyUsers({
      userIds: adminIds,
      type: "approval",
      title: "New trainer awaiting approval",
      message: `${caller.name} has requested trainer access.`,
      link: "/admin/user-approval",
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
