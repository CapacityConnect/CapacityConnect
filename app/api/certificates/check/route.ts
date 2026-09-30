import "server-only"
import { NextResponse } from "next/server"
import { handleRouteError, requireUser } from "@/lib/server/session"
import { maybeIssueCertificate } from "@/lib/server/certify"

/**
 * Called after a trainee finishes the last module (client-side progress
 * update), in case they already had a passing assessment attempt on file.
 * No-op if the course/enrollment isn't actually complete yet.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const courseId = typeof body?.courseId === "string" ? body.courseId : ""
    if (!courseId) return NextResponse.json({ error: "Missing courseId." }, { status: 400 })

    const certificate = await maybeIssueCertificate(user.uid, courseId)
    return NextResponse.json({ certificate })
  } catch (err) {
    return handleRouteError(err)
  }
}
