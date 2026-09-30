import "server-only"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { HttpError, handleRouteError, requireUser } from "@/lib/server/session"
import { notifyUsers } from "@/lib/server/notify"
import { maybeIssueCertificate } from "@/lib/server/certify"
import { computeCompetencyUpdate } from "@/lib/competency-math"
import { DEFAULT_PASS_MARK } from "@/lib/types"
import type { Assessment, AssessmentAnswerKey, AssessmentAttempt, AttemptReviewItem, CompetencyRecord } from "@/lib/types"

/**
 * Trusted grading endpoint. The client never sees `assessmentKeys` (blocked by
 * Firestore rules), so this is the only place a submission is compared
 * against the correct answers, the competency score is recomputed, and the
 * attempt + resulting certificate (if any) are written.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const answers: number[] = Array.isArray(body?.answers) ? body.answers : []

    const db = adminDb()
    const assessmentSnap = await db.collection("assessments").doc(id).get()
    if (!assessmentSnap.exists) throw new HttpError(404, "Assessment not found.")
    const assessment = assessmentSnap.data() as Assessment

    const keySnap = await db.collection("assessmentKeys").doc(id).get()
    if (!keySnap.exists) throw new HttpError(500, "Answer key is missing for this assessment.")
    const key = keySnap.data() as AssessmentAnswerKey

    if (answers.length !== assessment.questions.length) {
      throw new HttpError(400, "Answer count does not match the number of questions.")
    }

    const review: AttemptReviewItem[] = assessment.questions.map((q, i) => {
      const entry = key.answers[q.id]
      const correctIndex = entry?.correctIndex ?? -1
      const chosenIndex = Number.isInteger(answers[i]) ? answers[i] : -1
      return {
        questionId: q.id,
        chosenIndex,
        correctIndex,
        correct: chosenIndex === correctIndex,
        explanation: entry?.explanation ?? "",
      }
    })
    const correctCount = review.filter((r) => r.correct).length
    const score = Math.round((correctCount / assessment.questions.length) * 100)
    const passed = score >= (assessment.passMark ?? DEFAULT_PASS_MARK)

    const competencySnap = await db.collection("competencies").doc(user.uid).get()
    const record = competencySnap.exists ? (competencySnap.data() as CompetencyRecord) : null
    const currentEntry = record?.scores?.[assessment.competency] ?? {
      current: 40,
      target: 75,
      updatedAt: Date.now(),
    }
    const { newScore, improvement } = computeCompetencyUpdate(currentEntry.current, currentEntry.target, score)

    await db.collection("competencies").doc(user.uid).set(
      {
        userId: user.uid,
        updatedAt: Date.now(),
        [`scores.${assessment.competency}`]: {
          current: newScore,
          target: currentEntry.target,
          updatedAt: Date.now(),
        },
      },
      { merge: true },
    )

    const attempt: AssessmentAttempt = {
      id: `${user.uid}_${assessment.id}`,
      assessmentId: assessment.id,
      courseId: assessment.courseId,
      userId: user.uid,
      answers,
      review,
      passed,
      score,
      correctCount,
      totalQuestions: assessment.questions.length,
      competency: assessment.competency,
      competencyBefore: currentEntry.current,
      competencyAfter: newScore,
      improvement,
      submittedAt: Date.now(),
    }
    await db.collection("assessmentAttempts").doc(attempt.id).set(attempt)

    await notifyUsers({
      userIds: [user.uid],
      type: "achievement",
      title: "Assessment result ready",
      message: `You scored ${score}% on ${assessment.title}. ${assessment.competency} moved from ${currentEntry.current}% to ${newScore}%.`,
      link: "/trainee/assessments",
    })

    const certificate = await maybeIssueCertificate(user.uid, assessment.courseId)

    return NextResponse.json({ attempt, certificate })
  } catch (err) {
    return handleRouteError(err)
  }
}
