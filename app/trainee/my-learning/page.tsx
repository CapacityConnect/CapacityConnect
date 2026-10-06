"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { CourseCard } from "@/components/course-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCourse, listEnrollmentsForUser } from "@/lib/firebase/courses"
import type { Course, Enrollment } from "@/lib/types"
import { LiveDataError } from "@/components/live-data-state"

export default function MyLearningPage() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<{ course: Course; enrollment: Enrollment }[]>([])

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true); setError(null)
    try {
      const enrollments = await listEnrollmentsForUser(appUser.uid)
      const courses = await Promise.all(enrollments.map((enrollment) => getCourse(enrollment.courseId)))
      setItems(enrollments.map((enrollment, index) => ({ enrollment, course: courses[index] })).filter((item): item is { course: Course; enrollment: Enrollment } => Boolean(item.course)))
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load your live learning records.") }
    finally { setLoading(false) }
  }, [appUser])
  useEffect(() => { void load() }, [load])

  const inProgress = items.filter((i) => i.enrollment.status === "in-progress")
  const completed = items.filter((i) => i.enrollment.status === "completed")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My learning</h1>
        <p className="text-sm text-muted-foreground">Track progress across every course you&apos;ve enrolled in.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : error ? (
        <LiveDataError message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t enrolled in any courses yet. Browse courses to get started.
        </p>
      ) : (
        <Tabs defaultValue="in-progress">
          <TabsList>
            <TabsTrigger value="in-progress">In progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="in-progress" className="mt-4">
            {inProgress.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing in progress right now.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map(({ course, enrollment }) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    href={`/trainee/courses/${course.id}`}
                    progress={enrollment.progress}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="completed" className="mt-4">
            {completed.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No completed courses yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map(({ course, enrollment }) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    href={`/trainee/courses/${course.id}`}
                    progress={enrollment.progress}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
