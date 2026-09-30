"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { CourseCard } from "@/components/course-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listCoursesByTrainer } from "@/lib/firebase/courses"
import type { Course } from "@/lib/types"

export default function TrainerCoursesPage() {
  const { appUser } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    listCoursesByTrainer(appUser.uid).then((data) => {
      if (mounted) {
        setCourses(data)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [appUser])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My courses</h1>
          <p className="text-sm text-muted-foreground">Courses you&apos;ve authored and manage.</p>
        </div>
          <Button render={<Link href="/trainer/courses/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" /> Create course
          </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t created any courses yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} href={`/trainer/courses/${course.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
