"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, Megaphone, MessageSquare, Star, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { listCoursesByTrainer, listEnrollmentsForCourse } from "@/lib/firebase/courses"
import { listFeedbackForCourse } from "@/lib/firebase/feedback"
import { listAnnouncements } from "@/lib/firebase/announcements"
import { formatRelativeTime } from "@/lib/format"
import type { Announcement, Course, Feedback } from "@/lib/types"

export default function TrainerDashboard() {
  const { appUser } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollmentTotal, setEnrollmentTotal] = useState(0)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    async function load() {
      const c = await listCoursesByTrainer(appUser!.uid)
      const [enrollments, feedbackLists, allAnnouncements] = await Promise.all([
        Promise.all(c.map((course) => listEnrollmentsForCourse(course.id))),
        Promise.all(c.map((course) => listFeedbackForCourse(course.id))),
        listAnnouncements(),
      ])
      if (!mounted) return
      setCourses(c)
      setEnrollmentTotal(enrollments.reduce((sum, e) => sum + e.length, 0))
      setFeedback(
        feedbackLists
          .flat()
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5),
      )
      setAnnouncements(
        allAnnouncements.filter((a) => a.audience === "all" || a.audience === "trainer").slice(0, 4),
      )
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [appUser])

  const avgRating =
    feedback.length > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : "—"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {appUser?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Manage your courses and track learner engagement.</p>
        </div>
          <Button render={<Link href="/trainer/courses/new" />} nativeButton={false}>
            Create course
          </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Courses authored" value={courses.length} icon={BookOpen} />
          <StatCard label="Total enrollments" value={enrollmentTotal} icon={Users} />
          <StatCard label="Recent avg. rating" value={avgRating} icon={Star} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-primary" /> Recent feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            feedback.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{f.courseTitle}</p>
                  <p className="text-muted-foreground">{f.comment || "No comment left."}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.userName} · {formatRelativeTime(f.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-accent">
                  <Star className="size-3.5 fill-accent" /> {f.rating}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4 text-primary" /> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{a.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
