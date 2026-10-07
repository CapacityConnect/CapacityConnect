import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage"
import { db, storage } from "@/lib/firebase/config"
import type { LibraryResource, LibraryResourceCategory, Resource } from "@/lib/types"

export async function listResourcesForCourse(courseId: string): Promise<Resource[]> {
  try {
    const snap = await getDocs(query(collection(db, "resources"), where("courseId", "==", courseId), orderBy("createdAt", "desc")))
    return snap.docs.map((d) => d.data() as Resource)
  } catch {
    const snap = await getDocs(query(collection(db, "resources"), where("courseId", "==", courseId)))
    return snap.docs.map((d) => d.data() as Resource).sort((a, b) => b.createdAt - a.createdAt)
  }
}

function safeFileName(fileName: string) {
  return fileName.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, "-") || "upload"
}

function uploadFile(file: File, path: string, onProgress: (pct: number) => void) {
  return new Promise<import("firebase/storage").UploadTaskSnapshot>((resolve, reject) => {
    const storageRef = ref(storage, path)
    const contentType = file.type || "application/octet-stream"
    const task = uploadBytesResumable(storageRef, file, { contentType })
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      task.cancel()
      reject(new Error("Firebase Storage is unavailable. Enable Firebase Storage and billing for this project, then retry."))
    }, 30_000)
    function finish(callback: () => void) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback()
    }
    task.on(
      "state_changed",
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      },
      (error) => finish(() => reject(error)),
      () => finish(() => resolve(task.snapshot)),
    )
  })
}

export async function uploadCourseResource(
  courseId: string,
  file: File,
  meta: { title: string; uploadedBy: string; uploadedByName: string; moduleId?: string },
  onProgress: (pct: number) => void,
): Promise<Resource> {
  const path = `courses/${courseId}/${Date.now()}-${safeFileName(file.name)}`
  const snapshot = await uploadFile(file, path, onProgress)
  const url = await getDownloadURL(snapshot.ref)
  const resourceRef = doc(collection(db, "resources"))
  const resource: Resource = {
    id: resourceRef.id,
    courseId,
    moduleId: meta.moduleId,
    title: meta.title,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    url,
    uploadedBy: meta.uploadedBy,
    uploadedByName: meta.uploadedByName,
    createdAt: Date.now(),
  }
  await setDoc(resourceRef, resource)
  onProgress(100)
  return resource
}

export async function listLibraryResources(): Promise<LibraryResource[]> {
  try {
    const snap = await getDocs(query(collection(db, "libraryResources"), orderBy("createdAt", "desc")))
    return snap.docs.map((d) => d.data() as LibraryResource)
  } catch {
    const snap = await getDocs(collection(db, "libraryResources"))
    return snap.docs.map((d) => d.data() as LibraryResource).sort((a, b) => b.createdAt - a.createdAt)
  }
}

export async function uploadLibraryResource(
  file: File,
  meta: {
    title: string
    description?: string
    category: LibraryResourceCategory
    uploadedBy: string
    uploadedByName: string
    isInstitutionalKnowledge?: boolean
  },
  onProgress: (pct: number) => void,
): Promise<LibraryResource> {
  const path = `library/${meta.uploadedBy}/${Date.now()}-${safeFileName(file.name)}`
  const snapshot = await uploadFile(file, path, onProgress)
  const url = await getDownloadURL(snapshot.ref)
  const resourceRef = doc(collection(db, "libraryResources"))
  const resource: LibraryResource = {
    id: resourceRef.id,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    url,
    uploadedBy: meta.uploadedBy,
    uploadedByName: meta.uploadedByName,
    createdAt: Date.now(),
    ...(meta.isInstitutionalKnowledge ? { isInstitutionalKnowledge: true } : {}),
  }
  await setDoc(resourceRef, resource)
  onProgress(100)
  return resource
}
