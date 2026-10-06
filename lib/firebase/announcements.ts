import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Announcement } from "@/lib/types"

export async function listAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as Announcement)
}

// Creating an announcement also fans out notifications, which can't be
// written client-side (Firestore rules: `allow create: if false` on
// `notifications`). See POST /api/announcements.
