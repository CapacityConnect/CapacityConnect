import { collection, doc, getDocs, setDoc } from "firebase/firestore"
import { auth } from "@/lib/firebase/config"
import { db } from "@/lib/firebase/config"
import type { Evidence, EvidenceStatus } from "@/lib/types"

export async function listEvidenceForUser(userId: string): Promise<Evidence[]> {
  return readEvidence(`/api/evidence?userId=${encodeURIComponent(userId)}`)
}

export async function listEvidenceForCourse(userId: string, courseId: string): Promise<Evidence[]> {
  return readEvidence(`/api/evidence?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(courseId)}`)
}

// Trainers only ever review evidence for courses they own — trainerId is
// stamped onto the evidence doc at submission time so this is a direct query.
export async function listEvidenceForTrainer(trainerId: string): Promise<Evidence[]> {
  return readEvidence(`/api/evidence?scope=trainer&trainerId=${encodeURIComponent(trainerId)}`)
}

export async function listAllEvidence(): Promise<Evidence[]> {
  const snap = await getDocs(collection(db, "evidence"))
  return snap.docs.map((d) => d.data() as Evidence)
}

export async function submitEvidence(input: Omit<Evidence, "id" | "status" | "createdAt">): Promise<Evidence> {
  const ref = doc(collection(db, "evidence"))
  const evidence: Evidence = { ...input, id: ref.id, status: "pending", createdAt: Date.now() }
  await setDoc(ref, evidence)
  return evidence
}

export async function reviewEvidence(evidenceId: string, status: EvidenceStatus, reviewNote?: string) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not signed in.")
  const res = await fetch("/api/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ evidenceId, status, reviewNote: reviewNote ?? "" }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Failed to review evidence.")
}

async function readEvidence(path: string): Promise<Evidence[]> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not signed in.")
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "Failed to load evidence.")
  return (data.evidence ?? []) as Evidence[]
}
