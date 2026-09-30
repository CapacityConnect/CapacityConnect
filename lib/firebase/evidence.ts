import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Evidence, EvidenceStatus } from "@/lib/types"

export async function listEvidenceForUser(userId: string): Promise<Evidence[]> {
  const snap = await getDocs(query(collection(db, "evidence"), where("userId", "==", userId), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as Evidence)
}

export async function listEvidenceForCourse(userId: string, courseId: string): Promise<Evidence[]> {
  const snap = await getDocs(
    query(collection(db, "evidence"), where("userId", "==", userId), where("courseId", "==", courseId)),
  )
  return snap.docs.map((d) => d.data() as Evidence).sort((a, b) => b.createdAt - a.createdAt)
}

// Trainers only ever review evidence for courses they own — trainerId is
// stamped onto the evidence doc at submission time so this is a direct query.
export async function listEvidenceForTrainer(trainerId: string): Promise<Evidence[]> {
  const snap = await getDocs(
    query(collection(db, "evidence"), where("trainerId", "==", trainerId), orderBy("createdAt", "desc")),
  )
  return snap.docs.map((d) => d.data() as Evidence)
}

export async function submitEvidence(input: Omit<Evidence, "id" | "status" | "createdAt">): Promise<Evidence> {
  const ref = doc(collection(db, "evidence"))
  const evidence: Evidence = { ...input, id: ref.id, status: "pending", createdAt: Date.now() }
  await setDoc(ref, evidence)
  return evidence
}

export async function reviewEvidence(evidenceId: string, status: EvidenceStatus, reviewNote?: string) {
  await updateDoc(doc(db, "evidence", evidenceId), {
    status,
    reviewNote: reviewNote ?? "",
    reviewedAt: Date.now(),
  })
}
