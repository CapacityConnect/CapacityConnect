import "server-only"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { HttpError, handleRouteError, requireUser } from "@/lib/server/session"
import { notifyUsers } from "@/lib/server/notify"
import type { Course } from "@/lib/types"

/**
 * Trainer (course owner) or admin only. Fans a "new material" or "new
 * assessment" notification out to every enrolled trainee. The enrollment
 * list is read server-side rather than trusted from the client.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, { roles: ["trainer", "admin"] })
    const { id: courseId } = await params
    const body = await req.json().catch(() => ({}))
    const kind = body?.kind === "assessment" ? "assessment" : body?.kind === "material" ? "material" : null
    if (!kind) throw new HttpError(400, "kind must be 'material' or 'assessment'.")

    const db = adminDb()
    const courseSnap = await db.collection("courses").doc(courseId).get()
    if (!courseSnap.exists) throw new HttpError(404, "Course not found.")
    const course = courseSnap.data() as Course
    if (user.role === "trainer" && course.trainerId !== user.uid) {
      throw new HttpError(403, "You don't own this course.")
    }

    const enrollmentsSnap = await db.collection("enrollments").where("courseId", "==", courseId).get()
    const userIds = enrollmentsSnap.docs.map((d) => d.data().userId as string)
    if (userIds.length === 0) return NextResponse.json({ ok: true, notified: 0 })

    if (kind === "material") {
      const resourceTitle = typeof body?.resourceTitle === "string" ? body.resourceTitle : "a new resource"
      await notifyUsers({
        userIds,
        type: "material",
        title: "New course material",
        message: `${user.name} added "${resourceTitle}" to ${course.title}.`,
        link: `/trainee/courses/${courseId}`,
      })
    } else {
      const title = typeof body?.title === "string" ? body.title : "New assessment"
      const deadline = typeof body?.deadline === "number" ? body.deadline : undefined
      const assessmentId = typeof body?.assessmentId === "string" ? body.assessmentId : ""
      await notifyUsers({
        userIds,
        type: "deadline",
        title: "New assessment available",
        message: `"${title}" is now available for ${course.title}.${
          deadline ? ` Deadline: ${new Date(deadline).toLocaleDateString()}.` : ""
        }`,
        link: assessmentId ? `/trainee/assessments/${assessmentId}` : `/trainee/courses/${courseId}`,
      })
    }

    return NextResponse.json({ ok: true, notified: userIds.length })
  } catch (err) {
    return handleRouteError(err)
  }
}
