import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Feedback } from "@/lib/types"

export async function listFeedbackForCourse(courseId: string): Promise<Feedback[]> {
  const snap = await getDocs(query(collection(db, "feedback"), where("courseId", "==", courseId)))
  return snap.docs.map((d) => d.data() as Feedback).sort((a, b) => b.createdAt - a.createdAt)
}

export async function listFeedbackByUser(userId: string): Promise<Feedback[]> {
  const snap = await getDocs(query(collection(db, "feedback"), where("userId", "==", userId)))
  return snap.docs.map((d) => d.data() as Feedback).sort((a, b) => b.createdAt - a.createdAt)
}

export async function listAllFeedback(): Promise<Feedback[]> {
  const snap = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as Feedback)
}

export async function submitFeedback(input: Omit<Feedback, "id" | "createdAt">) {
  const ref = doc(collection(db, "feedback"))
  const feedback: Feedback = { ...input, id: ref.id, createdAt: Date.now() }
  await setDoc(ref, feedback)
  return feedback
}
