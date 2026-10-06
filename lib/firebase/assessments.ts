import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Assessment, AssessmentAnswerKey, AssessmentAttempt, AssessmentQuestionDraft, Certificate } from "@/lib/types"

export async function listAssessmentsForCourse(courseId: string): Promise<Assessment[]> {
  const snap = await getDocs(query(collection(db, "assessments"), where("courseId", "==", courseId)))
  return snap.docs.map((d) => d.data() as Assessment)
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const snap = await getDoc(doc(db, "assessments", id))
  return snap.exists() ? (snap.data() as Assessment) : null
}

/**
 * Looks up an assessment by its parent course id (not by assessment id).
 * A course can only have one "live" assessment surfaced to trainees — if a
 * trainer republishes, we show the most recently created one.
 */
export async function getAssessmentForCourse(courseId: string): Promise<Assessment | null> {
  const assessments = await listAssessmentsForCourse(courseId)
  if (assessments.length === 0) return null
  return assessments.sort((a, b) => b.createdAt - a.createdAt)[0]
}

interface CreateAssessmentInput {
  courseId: string
  competency: string
  title: string
  deadline?: number
  passMark?: number
  trainerId: string
  questions: AssessmentQuestionDraft[]
}

/**
 * Splits the trainer's draft (which includes correct answers) into the
 * trainee-readable `assessments` doc and the trainer/admin-only
 * `assessmentKeys` doc, matching the Firestore rules' trust boundary.
 */
export async function createAssessment(input: CreateAssessmentInput): Promise<Assessment> {
  const ref = doc(collection(db, "assessments"))
  const assessment: Assessment = {
    id: ref.id,
    courseId: input.courseId,
    competency: input.competency,
    title: input.title,
    deadline: input.deadline,
    passMark: input.passMark,
    trainerId: input.trainerId,
    questions: input.questions.map(({ id, text, options }) => ({ id, text, options })),
    createdAt: Date.now(),
  }

  const answers: AssessmentAnswerKey["answers"] = {}
  for (const q of input.questions) {
    answers[q.id] = { correctIndex: q.correctIndex, explanation: q.explanation }
  }
  const key: AssessmentAnswerKey = {
    id: ref.id,
    courseId: input.courseId,
    trainerId: input.trainerId,
    answers,
  }

  await setDoc(ref, assessment)
  await setDoc(doc(db, "assessmentKeys", ref.id), key)
  return assessment
}

export async function getAttempt(assessmentId: string, userId: string): Promise<AssessmentAttempt | null> {
  const snap = await getDoc(doc(db, "assessmentAttempts", `${userId}_${assessmentId}`))
  return snap.exists() ? (snap.data() as AssessmentAttempt) : null
}

export async function listAttemptsForAssessment(assessmentId: string): Promise<AssessmentAttempt[]> {
  const snap = await getDocs(query(collection(db, "assessmentAttempts"), where("assessmentId", "==", assessmentId)))
  return snap.docs.map((d) => d.data() as AssessmentAttempt)
}

export async function listAttemptsForUser(userId: string): Promise<AssessmentAttempt[]> {
  const snap = await getDocs(query(collection(db, "assessmentAttempts"), where("userId", "==", userId)))
  return snap.docs.map((d) => d.data() as AssessmentAttempt)
}

export async function listAllAttempts(): Promise<AssessmentAttempt[]> {
  const snap = await getDocs(collection(db, "assessmentAttempts"))
  return snap.docs.map((d) => d.data() as AssessmentAttempt)
}

/**
 * Submits an attempt for trusted server-side grading. The server reads the
 * protected `assessmentKeys` doc, computes the score, applies the competency
 * update, and (if the course is now complete) issues a certificate.
 */
export async function submitAssessmentAttempt(
  idToken: string,
  assessmentId: string,
  answers: number[],
): Promise<{ attempt: AssessmentAttempt; certificate: Certificate | null }> {
  const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ answers }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to submit assessment.")
  return data
}
