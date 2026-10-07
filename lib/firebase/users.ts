import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { AppUser, Role, UserStatus } from "@/lib/types"

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? (snap.data() as AppUser) : null
}

export async function listUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as AppUser)
}

export async function listUsersByRole(role: Role): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", role)))
  return snap.docs.map((d) => d.data() as AppUser)
}

export async function listPendingUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), where("status", "==", "pending")))
  return snap.docs.map((d) => d.data() as AppUser)
}

export async function setUserRole(uid: string, role: Role) {
  await updateDoc(doc(db, "users", uid), { role, status: "approved" })
}

export async function setUserStatus(uid: string, status: UserStatus) {
  await updateDoc(doc(db, "users", uid), { status })
}

export async function updateUserProfile(uid: string, data: Partial<AppUser>) {
  const { role, status, uid: _uid, email, ...safe } = data
  await updateDoc(doc(db, "users", uid), safe)
}
