import "server-only"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { HttpError, handleRouteError, requireUser } from "@/lib/server/session"
import { notifyUsers } from "@/lib/server/notify"
import type { Announcement, Role } from "@/lib/types"

/**
 * Admin-only. Notifications can't be created client-side (Firestore rules:
 * `allow create: if false`), so posting an announcement and fanning it out
 * to the target audience both happen here in one trusted call.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireUser(req, { roles: ["admin"] })
    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === "string" ? body.title.trim() : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    const audience: Announcement["audience"] = ["all", "trainee", "trainer"].includes(body?.audience)
      ? body.audience
      : "all"
    const kind: Announcement["kind"] = body?.kind === "achievement" ? "achievement" : "announcement"
    const showOnHomepage = Boolean(body?.showOnHomepage)
    if (!title || !message) throw new HttpError(400, "Title and message are required.")

    const db = adminDb()
    const ref = db.collection("announcements").doc()
    const announcement: Announcement = {
      id: ref.id,
      title,
      message,
      audience,
      kind,
      showOnHomepage,
      createdBy: admin.uid,
      createdAt: Date.now(),
    }
    await ref.set(announcement)

    const roles: Role[] = audience === "all" ? ["trainee", "trainer"] : [audience]
    const snaps = await Promise.all(roles.map((role) => db.collection("users").where("role", "==", role).get()))
    const userIds = snaps.flatMap((snap) => snap.docs.map((d) => d.id))

    await notifyUsers({ userIds, type: "announcement", title: announcement.title, message: announcement.message })

    return NextResponse.json({ announcement })
  } catch (err) {
    return handleRouteError(err)
  }
}
