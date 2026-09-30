import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage"
import { db, storage } from "@/lib/firebase/config"
import type { LibraryResource, LibraryResourceCategory, Resource } from "@/lib/types"

export async function listResourcesForCourse(courseId: string): Promise<Resource[]> {
  const snap = await getDocs(query(collection(db, "resources"), where("courseId", "==", courseId), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as Resource)
}

export function uploadCourseResource(
  courseId: string,
  file: File,
  meta: { title: string; uploadedBy: string; uploadedByName: string; moduleId?: string },
  onProgress: (pct: number) => void,
): Promise<Resource> {
  return new Promise((resolve, reject) => {
    const path = `courses/${courseId}/${Date.now()}-${file.name}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      "state_changed",
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
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
        resolve(resource)
      },
    )
  })
}

export async function listLibraryResources(): Promise<LibraryResource[]> {
  const snap = await getDocs(query(collection(db, "libraryResources"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as LibraryResource)
}

export function uploadLibraryResource(
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
  return new Promise((resolve, reject) => {
    const path = `library/${Date.now()}-${file.name}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      "state_changed",
      (snapshot) => {
        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
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
        resolve(resource)
      },
    )
  })
}
