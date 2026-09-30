import "server-only"
import { Resend } from "resend"
import type { AppNotification, AppUser } from "@/lib/types"
import { adminDb, adminMessaging } from "@/lib/server/firebase-admin"

export interface NotifyInput {
  userIds: string[]
  type: AppNotification["type"]
  title: string
  message: string
  link?: string
  /** Also send an email (only when RESEND_API_KEY + EMAIL_FROM are configured). */
  email?: boolean
}

export interface DeliveryReport {
  inApp: number
  push: { sent: number; failed: number; skipped: boolean }
  email: { sent: number; failed: number; skipped: boolean; reason?: string }
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM
}

/**
 * Single trusted fan-out point for every event: in-app notification document,
 * FCM web push to the user's registered devices, and optional email.
 * Each channel fails independently so one misconfigured channel never blocks the others.
 */
export async function notifyUsers(input: NotifyInput): Promise<DeliveryReport> {
  const db = adminDb()
  const userIds = [...new Set(input.userIds)].filter(Boolean)
  const report: DeliveryReport = {
    inApp: 0,
    push: { sent: 0, failed: 0, skipped: false },
    email: { sent: 0, failed: 0, skipped: !input.email || !emailConfigured() },
  }
  if (userIds.length === 0) return report

  const now = Date.now()
  for (let i = 0; i < userIds.length; i += 400) {
    const batch = db.batch()
    for (const userId of userIds.slice(i, i + 400)) {
      const ref = db.collection("notifications").doc()
      batch.set(ref, {
        id: ref.id,
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        read: false,
        createdAt: now,
        ...(input.link ? { link: input.link } : {}),
      } satisfies AppNotification)
    }
    await batch.commit()
  }
  report.inApp = userIds.length

  report.push = await sendPush(userIds, input).catch((err) => {
    console.error("[v0] FCM send failed:", err)
    return { sent: 0, failed: userIds.length, skipped: false }
  })

  if (input.email && emailConfigured()) {
    report.email = await sendEmail(userIds, input).catch((err) => {
      console.error("[v0] email send failed:", err)
      return { sent: 0, failed: userIds.length, skipped: false, reason: String(err) }
    })
  } else if (input.email) {
    report.email.reason = "Email not configured (RESEND_API_KEY / EMAIL_FROM)."
  }
  return report
}

async function sendPush(userIds: string[], input: NotifyInput) {
  const db = adminDb()
  const tokenOwners = new Map<string, string>()
  const refs = userIds.map((uid) => db.collection("pushTokens").doc(uid))
  for (let i = 0; i < refs.length; i += 100) {
    const snaps = await db.getAll(...refs.slice(i, i + 100))
    for (const snap of snaps) {
      const tokens = (snap.data()?.tokens as string[] | undefined) ?? []
      for (const t of tokens) tokenOwners.set(t, snap.id)
    }
  }
  const tokens = [...tokenOwners.keys()]
  if (tokens.length === 0) return { sent: 0, failed: 0, skipped: true }

  let sent = 0
  let failed = 0
  const stale: Array<{ uid: string; token: string }> = []
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500)
    const res = await adminMessaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title: input.title, body: input.message },
      data: { link: input.link ?? "/", type: input.type },
      webpush: { fcmOptions: input.link && siteUrl ? { link: `${siteUrl}${input.link}` } : undefined },
    })
    sent += res.successCount
    failed += res.failureCount
    res.responses.forEach((r, idx) => {
      const code = r.error?.code
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        stale.push({ uid: tokenOwners.get(chunk[idx])!, token: chunk[idx] })
      }
    })
  }

  if (stale.length) {
    const { FieldValue } = await import("firebase-admin/firestore")
    await Promise.all(
      stale.map(({ uid, token }) =>
        db.collection("pushTokens").doc(uid).update({ tokens: FieldValue.arrayRemove(token) }),
      ),
    )
  }
  return { sent, failed, skipped: false }
}

async function sendEmail(userIds: string[], input: NotifyInput) {
  const db = adminDb()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const snaps = await db.getAll(...userIds.map((uid) => db.collection("users").doc(uid)))
  const recipients = snaps.map((s) => (s.data() as AppUser | undefined)?.email).filter((e): e is string => !!e)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const linkHtml =
    input.link && siteUrl ? `<p><a href="${siteUrl}${input.link}">Open in Capacity Connect</a></p>` : ""
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
<h2 style="margin:0 0 8px">${escapeHtml(input.title)}</h2>
<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(input.message)}</p>${linkHtml}
<p style="color:#666;font-size:12px">Capacity Connect — Institutional Capacity Building Platform</p></div>`

  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const { error } = await resend.batch.send(
      recipients.slice(i, i + 100).map((to) => ({
        from: process.env.EMAIL_FROM!,
        to,
        subject: input.title,
        html,
      })),
    )
    if (error) failed += recipients.slice(i, i + 100).length
    else sent += recipients.slice(i, i + 100).length
  }
  return { sent, failed, skipped: false }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
