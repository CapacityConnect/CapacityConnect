import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Course, CourseModule, Enrollment } from "@/lib/types"

export async function listCourses(): Promise<Course[]> {
  const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => d.data() as Course)
}

export async function listCoursesByTrainer(trainerId: string): Promise<Course[]> {
  const snap = await getDocs(query(collection(db, "courses"), where("trainerId", "==", trainerId)))
  return snap.docs.map((d) => d.data() as Course)
}

export async function listCoursesByCompetency(competency: string): Promise<Course[]> {
  const snap = await getDocs(query(collection(db, "courses"), where("competency", "==", competency)))
  return snap.docs.map((d) => d.data() as Course)
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, "courses", courseId))
  return snap.exists() ? (snap.data() as Course) : null
}

export async function createCourse(input: Omit<Course, "id" | "enrollmentCount" | "createdAt" | "modules"> & { modules: Omit<CourseModule, "id">[] }) {
  const ref = doc(collection(db, "courses"))
  const modules: CourseModule[] = input.modules.map((m, i) => ({ ...m, id: `m${i + 1}`, order: i + 1 }))
  const course: Course = { ...input, id: ref.id, modules, enrollmentCount: 0, createdAt: Date.now() }
  await setDoc(ref, course)
  return course
}

export async function updateCourse(courseId: string, data: Partial<Course>) {
  await updateDoc(doc(db, "courses", courseId), data)
}

export async function enrollInCourse(userId: string, courseId: string): Promise<Enrollment> {
  const id = `${userId}_${courseId}`
  const ref = doc(db, "enrollments", id)
  const existing = await getDoc(ref)
  if (existing.exists()) return existing.data() as Enrollment
  const enrollment: Enrollment = {
    id,
    userId,
    courseId,
    progress: 0,
    completedModules: [],
    status: "in-progress",
    enrolledAt: Date.now(),
  }
  await setDoc(ref, enrollment)
  await updateDoc(doc(db, "courses", courseId), { enrollmentCount: increment(1) })
  return enrollment
}

export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const snap = await getDoc(doc(db, "enrollments", `${userId}_${courseId}`))
  return snap.exists() ? (snap.data() as Enrollment) : null
}

export async function listEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
  const snap = await getDocs(query(collection(db, "enrollments"), where("userId", "==", userId)))
  return snap.docs.map((d) => d.data() as Enrollment)
}

export async function listEnrollmentsForCourse(courseId: string): Promise<Enrollment[]> {
  const snap = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId)))
  return snap.docs.map((d) => d.data() as Enrollment)
}

export async function markModuleComplete(userId: string, courseId: string, moduleId: string, totalModules: number) {
  const ref = doc(db, "enrollments", `${userId}_${courseId}`)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const enrollment = snap.data() as Enrollment
  const completedModules = Array.from(new Set([...enrollment.completedModules, moduleId]))
  const progress = Math.round((completedModules.length / totalModules) * 100)
  const status = progress >= 100 ? "completed" : "in-progress"
  await updateDoc(ref, {
    completedModules,
    progress,
    status,
    ...(status === "completed" ? { completedAt: Date.now() } : {}),
  })
}
