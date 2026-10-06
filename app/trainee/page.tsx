"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Award, BarChart3, BookOpen, CheckCircle2, ClipboardCheck, Gauge, GraduationCap, Megaphone, ShieldCheck, Target, UserRound } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StatCard } from "@/components/stat-card"
import { CompetencyBar } from "@/components/competency-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ensureCompetencyRecord, getPriorityGap } from "@/lib/firebase/competencies"
import { listEnrollmentsForUser, listCoursesByCompetency } from "@/lib/firebase/courses"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import { listEvidenceForUser } from "@/lib/firebase/evidence"
import { listAnnouncements } from "@/lib/firebase/announcements"
import { formatRelativeTime } from "@/lib/format"
import { averageCompetencyAttainment, computeReadinessScore } from "@/lib/competency-math"
import type { Announcement, CompetencyRecord, Course, Enrollment } from "@/lib/types"

export default function TraineeDashboard() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [competencyRecord, setCompetencyRecord] = useState<CompetencyRecord | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [certificateCount, setCertificateCount] = useState(0)
  const [verifiedEvidenceCount, setVerifiedEvidenceCount] = useState(0)
  const [recommended, setRecommended] = useState<Course[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true)
    setError(null)
    try {
      const [record, userEnrollments, certificates, allAnnouncements, evidence] = await Promise.all([
        ensureCompetencyRecord(appUser.uid),
        listEnrollmentsForUser(appUser.uid),
        listCertificatesForUser(appUser.uid),
        listAnnouncements(),
        listEvidenceForUser(appUser.uid),
      ])
      const gap = getPriorityGap(record)
      const courses = gap ? await listCoursesByCompetency(gap.competency) : []
      const enrolledIds = new Set(userEnrollments.map((enrollment) => enrollment.courseId))
      setCompetencyRecord(record)
      setEnrollments(userEnrollments)
      setCertificateCount(certificates.length)
      setVerifiedEvidenceCount(evidence.filter((item) => item.status === "verified").length)
      setAnnouncements(allAnnouncements.filter((item) => item.audience === "all" || item.audience === "trainee").slice(0, 4))
      setRecommended(courses.filter((course) => !enrolledIds.has(course.id)).slice(0, 3))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your live Firebase dashboard.")
    } finally {
      setLoading(false)
    }
  }, [appUser])

  useEffect(() => { void load() }, [load])

  const priorityGap = getPriorityGap(competencyRecord)
  const inProgressCount = enrollments.filter((e) => e.status === "in-progress").length
  const completedCount = enrollments.filter((e) => e.status === "completed").length
  const readinessScore = computeReadinessScore(competencyRecord ? averageCompetencyAttainment(competencyRecord.scores) : 0, verifiedEvidenceCount, certificateCount)
  const lifecycleSteps: Array<{ icon: typeof Target; label: string; value: string; done: boolean }> = [
    { icon: Target, label: "Gap", value: priorityGap ? priorityGap.competency : "On target", done: Boolean(priorityGap) },
    { icon: UserRound, label: "Trainer match", value: recommended[0]?.trainerName ?? "Browse trainers", done: recommended.length > 0 },
    { icon: BookOpen, label: "Learning", value: `${inProgressCount + completedCount} enrolled`, done: enrollments.length > 0 },
    { icon: ClipboardCheck, label: "Assessment", value: `${completedCount} complete`, done: completedCount > 0 },
    { icon: ShieldCheck, label: "Evidence", value: `${verifiedEvidenceCount} verified`, done: verifiedEvidenceCount > 0 },
    { icon: CheckCircle2, label: "Readiness", value: `${readinessScore}%`, done: readinessScore >= 60 },
  ]

  return <div className="flex flex-col gap-6">
    <div><h1 className="text-2xl font-semibold">Welcome back, {appUser?.name?.split(" ")[0]}</h1><p className="text-sm text-muted-foreground">Here&apos;s where your learning stands today.</p></div>
    {error && <Card className="border-destructive/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium text-destructive">Live dashboard unavailable</p><p className="text-sm text-muted-foreground">{error}</p></div><Button variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card>}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="Job readiness" value={`${readinessScore}%`} icon={Gauge} hint="Skills + verified proof" /><StatCard label="Courses in progress" value={inProgressCount} icon={BookOpen} /><StatCard label="Courses completed" value={completedCount} icon={GraduationCap} /><StatCard label="Certificates earned" value={certificateCount} icon={Award} /><StatCard label="Priority gap" value={priorityGap ? `${priorityGap.gap}%` : "None"} icon={Target} hint={priorityGap?.competency} /></div>}
    <div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-primary" /> Competency progress</CardTitle><CardDescription>Your current standing against target proficiency for each skill.</CardDescription></CardHeader><CardContent className="space-y-4">{loading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />) : competencyRecord && Object.keys(competencyRecord.scores).length > 0 ? Object.entries(competencyRecord.scores).map(([name, score]) => <CompetencyBar key={name} label={name} current={score.current} target={score.target} />) : <p className="text-sm text-muted-foreground">No competency data yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Recommended next step</CardTitle><CardDescription>{priorityGap ? `Closing your ${priorityGap.competency} gap will have the biggest impact.` : "You&apos;re on track across all competencies."}</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <Skeleton className="h-32 w-full" /> : recommended.length > 0 ? recommended.map((course) => <Link key={course.id} href={`/trainee/courses/${course.id}`} className="block rounded-md border border-border p-3 text-sm hover:border-primary/40"><p className="font-medium">{course.title}</p><p className="text-xs text-muted-foreground">{course.durationHours}h · {course.difficulty}</p></Link>) : <p className="text-sm text-muted-foreground">No new recommendations for your current gap.</p>}<Button render={<Link href="/trainee/courses" />} nativeButton={false} variant="outline" className="w-full">Browse all courses</Button></CardContent></Card></div>
    {!loading && <Card className="border-primary/15"><CardHeader><CardTitle className="text-base">Your capability path</CardTitle><CardDescription>One connected view from diagnosis to portable readiness proof.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{lifecycleSteps.map(({ icon: Icon, label, value, done }) => <div key={label} className="rounded-lg border border-border bg-muted/20 p-3"><Icon className={`size-4 ${done ? "text-success" : "text-muted-foreground"}`} /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium">{value}</p></div>)}</CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="size-4 text-primary" /> Announcements</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <Skeleton className="h-16 w-full" /> : announcements.length === 0 ? <p className="text-sm text-muted-foreground">No announcements yet.</p> : announcements.map((announcement) => <div key={announcement.id} className="rounded-md border border-border p-3 text-sm"><div className="flex items-center justify-between gap-2"><p className="font-medium">{announcement.title}</p><span className="text-xs text-muted-foreground">{formatRelativeTime(announcement.createdAt)}</span></div><p className="mt-1 text-muted-foreground">{announcement.message}</p></div>)}</CardContent></Card>
  </div>
}
