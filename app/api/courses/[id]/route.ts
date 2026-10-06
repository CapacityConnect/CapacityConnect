import "server-only"
import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { handleRouteError, requireUser, HttpError } from "@/lib/server/session"
import { adminDb } from "@/lib/server/firebase-admin"
import type { Course, Enrollment } from "@/lib/types"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await params
    const snap = await adminDb().collection("courses").doc(id).get()
    if (!snap.exists) return NextResponse.json({ course: null })
    const course = snap.data() as Course
    if (user.role === "trainee" && course.published === false) return NextResponse.json({ course: null })
    if (user.role === "trainer" && course.trainerId !== user.uid) throw new HttpError(403, "You do not own this course.")
    return NextResponse.json({ course })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, { roles: ["trainee"] })
    const { id: courseId } = await params
    const courseRef = adminDb().collection("courses").doc(courseId)
    const enrollmentRef = adminDb().collection("enrollments").doc(`${user.uid}_${courseId}`)
    const enrollment = await adminDb().runTransaction(async (transaction) => {
      const courseSnap = await transaction.get(courseRef)
      const existing = await transaction.get(enrollmentRef)
      if (!courseSnap.exists) throw new HttpError(404, "Course not found.")
      const course = courseSnap.data() as Course
      if (course.published === false) throw new HttpError(404, "Course not found.")
      if (existing.exists) return existing.data() as Enrollment
      const created: Enrollment = {
        id: enrollmentRef.id,
        userId: user.uid,
        courseId,
        progress: 0,
        completedModules: [],
        status: "in-progress",
        enrolledAt: Date.now(),
      }
      transaction.set(enrollmentRef, created)
      transaction.update(courseRef, { enrollmentCount: FieldValue.increment(1) })
      return created
    })
    return NextResponse.json({ enrollment })
  } catch (err) {
    return handleRouteError(err)
  }
}
