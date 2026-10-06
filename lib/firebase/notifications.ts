import { collection, doc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { AppNotification } from "@/lib/types"

// Notifications are never created client-side (Firestore rules: `allow
// create: if false`). All fan-out happens server-side via
// lib/server/notify.ts, called from trusted API routes.

export async function listNotificationsForUser(userId: string): Promise<AppNotification[]> {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc")),
  )
  return snap.docs.map((d) => d.data() as AppNotification)
}

export async function listAdminBroadcastNotifications(): Promise<AppNotification[]> {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", "admin-broadcast"), orderBy("createdAt", "desc")),
  )
  return snap.docs.map((d) => d.data() as AppNotification)
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, "notifications", id), { read: true })
}
