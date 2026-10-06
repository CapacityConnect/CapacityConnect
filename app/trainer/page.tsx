"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, BadgeCheck, BookOpen, CheckCircle2, Clock3, Megaphone, MessageSquare, Star, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { listCoursesByTrainer, listEnrollmentsForCourse } from "@/lib/firebase/courses"
import { listFeedbackForCourse } from "@/lib/firebase/feedback"
import { listAnnouncements } from "@/lib/firebase/announcements"
import { listEvidenceForTrainer } from "@/lib/firebase/evidence"
import { getAssessmentForCourse, listAttemptsForAssessment } from "@/lib/firebase/assessments"
import { formatRelativeTime } from "@/lib/format"
import type { Announcement, AssessmentAttempt, Course, Enrollment, Evidence, Feedback } from "@/lib/types"

interface CourseRow {
  course: Course
  enrollments: Enrollment[]
  attempts: AssessmentAttempt[]
}

export default function TrainerDashboard() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<CourseRow[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true); setError(null)
    try {
      const courses = await listCoursesByTrainer(appUser.uid)
      const [courseRows, feedbackLists, allAnnouncements, trainerEvidence] = await Promise.all([
        Promise.all(courses.map(async (course) => {
          const [enrollments, assessment] = await Promise.all([listEnrollmentsForCourse(course.id), getAssessmentForCourse(course.id)])
          const attempts = assessment ? await listAttemptsForAssessment(assessment.id) : []
          return { course, enrollments, attempts }
        })),
        Promise.all(courses.map((course) => listFeedbackForCourse(course.id))),
        listAnnouncements(),
        listEvidenceForTrainer(appUser.uid),
      ])
      setRows(courseRows)
      setFeedback(feedbackLists.flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5))
      setAnnouncements(allAnnouncements.filter((item) => item.audience === "all" || item.audience === "trainer").slice(0, 4))
      setEvidence(trainerEvidence)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your live Firebase dashboard.")
    } finally { setLoading(false) }
  }, [appUser])

  useEffect(() => { void load() }, [load])

  const allEnrollments = useMemo(() => rows.flatMap((row) => row.enrollments), [rows])
  const allAttempts = useMemo(() => rows.flatMap((row) => row.attempts), [rows])
  const completed = allEnrollments.filter((item) => item.status === "completed").length
  const averageProgress = allEnrollments.length ? Math.round(allEnrollments.reduce((sum, item) => sum + item.progress, 0) / allEnrollments.length) : 0
  const averageScore = allAttempts.length ? Math.round(allAttempts.reduce((sum, item) => sum + item.score, 0) / allAttempts.length) : 0
  const avgRating = feedback.length ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1) : "—"
  const pendingEvidence = evidence.filter((item) => item.status === "pending").length
  const activeCourses = rows

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-primary p-5 text-primary-foreground shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[24px] border-accent/20" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Trainer workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {appUser?.name?.split(" ")[0]}</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/75">A focused view of your learners, course momentum, assessment signals and evidence waiting for your judgement.</p>
          </div>
          <Button render={<Link href="/trainer/courses/new" />} nativeButton={false} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"><BookOpen className="size-4" /> Create course</Button>
        </div>
      </section>

      {error && <Card className="border-destructive/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium text-destructive">Live dashboard unavailable</p><p className="text-sm text-muted-foreground">{error}</p></div><Button variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card>}

      {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Active courses" value={activeCourses.length} icon={BookOpen} /><StatCard label="Learners reached" value={new Set(allEnrollments.map((item) => item.userId)).size} icon={Users} /><StatCard label="Avg. progress" value={`${averageProgress}%`} icon={Clock3} /><StatCard label="Assessment average" value={`${averageScore}%`} icon={CheckCircle2} /><StatCard label="Avg. rating" value={avgRating} icon={Star} /></div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/20 pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-accent" /> Learner progress</CardTitle><CardDescription>Course momentum across your active cohorts.</CardDescription></div><Button render={<Link href="/trainer/participation" />} nativeButton={false} variant="ghost" size="sm">Full view <ArrowUpRight className="size-3.5" /></Button></div></CardHeader>
          <CardContent className="p-0">{rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Create a course to start seeing learner progress.</p> : <div className="divide-y divide-border/70">{rows.slice(0, 6).map(({ course, enrollments }) => { const progress = enrollments.length ? Math.round(enrollments.reduce((sum, item) => sum + item.progress, 0) / enrollments.length) : 0; return <div key={course.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><p className="truncate text-sm font-medium">{course.title}</p><Badge variant="secondary" className="shrink-0">{enrollments.length} learner{enrollments.length === 1 ? "" : "s"}</Badge></div><Progress value={progress} className="h-2" /><p className="mt-1.5 text-xs text-muted-foreground">{progress}% average completion</p></div><div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span>{enrollments.filter((item) => item.status === "completed").length} completed</span><ArrowUpRight className="size-3.5" /></div></div> })}</div>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/70 bg-muted/20 pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><BadgeCheck className="size-4 text-accent" /> Evidence queue</CardTitle><CardDescription>Applied work needing your review.</CardDescription></div><Button render={<Link href="/trainer/evidence" />} nativeButton={false} variant="ghost" size="sm">Review <ArrowUpRight className="size-3.5" /></Button></div></CardHeader>
          <CardContent className="space-y-3 p-4">{pendingEvidence === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-center"><CheckCircle2 className="mx-auto size-7 text-success" /><p className="mt-2 text-sm font-medium">Queue is clear</p><p className="mt-1 text-xs text-muted-foreground">No pending evidence reviews right now.</p></div> : evidence.filter((item) => item.status === "pending").slice(0, 3).map((item) => <div key={item.id} className="rounded-xl border border-border p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><Badge className="bg-accent/15 text-accent-foreground hover:bg-accent/20">Pending</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.userName} · {item.competency}</p></div>)}{pendingEvidence > 3 && <p className="text-xs text-muted-foreground">+ {pendingEvidence - 3} more waiting</p>}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="size-4 text-accent" /> Recent learner voice</CardTitle><CardDescription>Feedback from your latest course activity.</CardDescription></CardHeader><CardContent className="space-y-3">{feedback.length === 0 ? <p className="text-sm text-muted-foreground">No feedback has been submitted yet.</p> : feedback.slice(0, 3).map((item) => <div key={item.id} className="rounded-xl border border-border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.courseTitle}</p><p className="mt-1 text-sm text-muted-foreground">{item.comment || "No comment left."}</p></div><span className="flex shrink-0 items-center gap-1 text-sm text-accent"><Star className="size-3.5 fill-accent" />{item.rating}</span></div><p className="mt-2 text-xs text-muted-foreground">{item.userName} · {formatRelativeTime(item.createdAt)}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="size-4 text-accent" /> Role-specific updates</CardTitle><CardDescription>Announcements relevant to trainers.</CardDescription></CardHeader><CardContent className="space-y-3">{announcements.length === 0 ? <p className="text-sm text-muted-foreground">No trainer announcements yet.</p> : announcements.map((item) => <div key={item.id} className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><span className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p></div>)}</CardContent></Card>
      </div>
    </div>
  )
}
