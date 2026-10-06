import "server-only"
import { NextResponse } from "next/server"
import { handleRouteError, requireUser } from "@/lib/server/session"
import { adminDb } from "@/lib/server/firebase-admin"

export async function GET(req: Request) {
  try {
    await requireUser(req, { roles: ["admin"] })
    const db = adminDb()
    const [users, courses, enrollments, competencies, certificates, attempts, evidence] = await Promise.all([
      db.collection("users").get(),
      db.collection("courses").get(),
      db.collection("enrollments").get(),
      db.collection("competencies").get(),
      db.collection("certificates").get(),
      db.collection("assessmentAttempts").get(),
      db.collection("evidence").get(),
    ])
    return NextResponse.json({
      users: users.docs.map((doc) => doc.data()),
      courses: courses.docs.map((doc) => doc.data()),
      enrollments: enrollments.docs.map((doc) => doc.data()),
      records: competencies.docs.map((doc) => doc.data()),
      certificates: certificates.docs.map((doc) => doc.data()),
      attempts: attempts.docs.map((doc) => doc.data()),
      evidence: evidence.docs.map((doc) => doc.data()),
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
