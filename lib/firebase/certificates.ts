import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Certificate } from "@/lib/types"

export async function listCertificatesForUser(userId: string): Promise<Certificate[]> {
  const snap = await getDocs(
    query(collection(db, "certificates"), where("userId", "==", userId), orderBy("issuedAt", "desc")),
  )
  return snap.docs.map((d) => d.data() as Certificate)
}

export async function getCertificateForCourse(userId: string, courseId: string): Promise<Certificate | null> {
  const snap = await getDoc(doc(db, "certificates", `${userId}_${courseId}`))
  return snap.exists() ? (snap.data() as Certificate) : null
}

/**
 * Certificates are only ever written by the server (Firestore rules block
 * client create/update). This asks the server to check whether the trainee
 * now qualifies — e.g. right after finishing the final module — and issues
 * one if so.
 */
export async function checkForCertificate(idToken: string, courseId: string): Promise<Certificate | null> {
  const res = await fetch("/api/certificates/check", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ courseId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to check certificate status.")
  return data.certificate as Certificate | null
}
