import "server-only"
import { adminDb } from "@/lib/server/firebase-admin"
import { notifyUsers } from "@/lib/server/notify"
import type { AppUser, Assessment, AssessmentAttempt, Certificate, Course, Enrollment } from "@/lib/types"

/**
 * Issues a certificate the first time a trainee has (a) a completed enrollment
 * and (b) — if the course has an assessment — a passing attempt on it. Safe to
 * call repeatedly: returns the existing certificate once issued.
 *
 * Called from both the assessment-submit route (in case the modules were
 * already finished) and the certificate-check route (in case the last module
 * was completed after the assessment was already passed), since either order
 * is possible.
 */
export async function maybeIssueCertificate(userId: string, courseId: string): Promise<Certificate | null> {
  const db = adminDb()
  const certId = `${userId}_${courseId}`

  const existingSnap = await db.collection("certificates").doc(certId).get()
  if (existingSnap.exists) return existingSnap.data() as Certificate

  const enrollmentSnap = await db.collection("enrollments").doc(certId).get()
  if (!enrollmentSnap.exists) return null
  const enrollment = enrollmentSnap.data() as Enrollment
  if (enrollment.status !== "completed") return null

  const courseSnap = await db.collection("courses").doc(courseId).get()
  if (!courseSnap.exists) return null
  const course = courseSnap.data() as Course

  let score: number | null = null
  const assessmentsSnap = await db.collection("assessments").where("courseId", "==", courseId).get()
  if (!assessmentsSnap.empty) {
    const latest = assessmentsSnap.docs
      .map((d) => d.data() as Assessment)
      .sort((a, b) => b.createdAt - a.createdAt)[0]
    const attemptSnap = await db.collection("assessmentAttempts").doc(`${userId}_${latest.id}`).get()
    if (!attemptSnap.exists) return null
    const attempt = attemptSnap.data() as AssessmentAttempt
    if (!attempt.passed) return null
    score = attempt.score
  }

  const userSnap = await db.collection("users").doc(userId).get()
  const user = userSnap.exists ? (userSnap.data() as AppUser) : null

  const certificate: Certificate = {
    id: certId,
    userId,
    userName: user?.name ?? "Learner",
    courseId,
    courseTitle: course.title,
    trainerId: course.trainerId,
    competency: course.competency,
    score,
    certId: `CC-${courseId.slice(0, 5).toUpperCase()}-${userId.slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    issuedAt: Date.now(),
  }
  await db.collection("certificates").doc(certId).set(certificate)

  await notifyUsers({
    userIds: [userId],
    type: "achievement",
    title: "Certificate issued",
    message: `You earned a certificate for completing ${course.title}.`,
    link: "/trainee/certificates",
  })

  return certificate
}
