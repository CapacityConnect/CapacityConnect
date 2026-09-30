"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { CourseCard } from "@/components/course-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { listCourses } from "@/lib/firebase/courses"
import { seedDemoData } from "@/lib/firebase/seed"
import { Database } from "lucide-react"
import type { Course } from "@/lib/types"

export default function AdminCoursesPage() {
  const { appUser } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  async function load() {
    const data = await listCourses()
    setCourses(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSeed() {
    if (!appUser) return
    setSeeding(true)
    const result = await seedDemoData(appUser.uid)
    setSeeding(false)
    if (result.seeded) {
      toast.success("Demo data seeded")
      load()
    } else {
      toast.info(result.reason ?? "Demo data already exists")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">All courses</h1>
          <p className="text-sm text-muted-foreground">Every course across the platform.</p>
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seeding}>
          <Database className="size-4" /> Seed demo data
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No courses yet. Seed demo data to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} href={`/trainee/courses/${course.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
