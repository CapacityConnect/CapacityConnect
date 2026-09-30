"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Award, BarChart3, BookOpen, Gauge, GraduationCap, Megaphone, Target } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StatCard } from "@/components/stat-card"
import { CompetencyBar } from "@/components/competency-bar"
import { CourseCard } from "@/components/course-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ensureCompetencyRecord, getPriorityGap } from "@/lib/firebase/competencies"
import { listEnrollmentsForUser, listCoursesByCompetency, getCourse } from "@/lib/firebase/courses"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import { listEvidenceForUser } from "@/lib/firebase/evidence"
import { listAnnouncements } from "@/lib/firebase/announcements"
import { formatRelativeTime } from "@/lib/format"
import { averageCompetencyAttainment, computeReadinessScore } from "@/lib/competency-math"
import type { Announcement, CompetencyRecord, Course, Enrollment } from "@/lib/types"

export default function TraineeDashboard() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [competencyRecord, setCompetencyRecord] = useState<CompetencyRecord | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [certificateCount, setCertificateCount] = useState(0)
  const [verifiedEvidenceCount, setVerifiedEvidenceCount] = useState(0)
  const [recommended, setRecommended] = useState<Course[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    async function load() {
      const [record, userEnrollments, certificates, allAnnouncements, evidence] = await Promise.all([
        ensureCompetencyRecord(appUser!.uid),
        listEnrollmentsForUser(appUser!.uid),
        listCertificatesForUser(appUser!.uid),
        listAnnouncements(),
        listEvidenceForUser(appUser!.uid),
      ])
      if (!mounted) return
      setCompetencyRecord(record)
      setEnrollments(userEnrollments)
      setCertificateCount(certificates.length)
      setVerifiedEvidenceCount(evidence.filter((e) => e.status === "verified").length)
      setAnnouncements(
        allAnnouncements.filter((a) => a.audience === "all" || a.audience === "trainee").slice(0, 4),
      )

      const gap = getPriorityGap(record)
      if (gap) {
        const courses = await listCoursesByCompetency(gap.competency)
        const enrolledIds = new Set(userEnrollments.map((e) => e.courseId))
        if (mounted) setRecommended(courses.filter((c) => !enrolledIds.has(c.id)).slice(0, 3))
      }
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [appUser])

  const priorityGap = getPriorityGap(competencyRecord)
  const inProgressCount = enrollments.filter((e) => e.status === "in-progress").length
  const completedCount = enrollments.filter((e) => e.status === "completed").length
  const readinessScore = computeReadinessScore(
    competencyRecord ? averageCompetencyAttainment(competencyRecord.scores) : 0,
    verifiedEvidenceCount,
    certificateCount,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {appUser?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s where your learning stands today.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Job readiness" value={`${readinessScore}%`} icon={Gauge} hint="Skills + verified proof" />
          <StatCard label="Courses in progress" value={inProgressCount} icon={BookOpen} />
          <StatCard label="Courses completed" value={completedCount} icon={GraduationCap} />
          <StatCard label="Certificates earned" value={certificateCount} icon={Award} />
          <StatCard
            label="Priority gap"
            value={priorityGap ? `${priorityGap.gap}%` : "None"}
            icon={Target}
            hint={priorityGap?.competency}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" /> Competency progress
            </CardTitle>
            <CardDescription>Your current standing against target proficiency for each skill.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
            ) : competencyRecord ? (
              Object.entries(competencyRecord.scores).map(([name, score]) => (
                <CompetencyBar key={name} label={name} current={score.current} target={score.target} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No competency data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended next step</CardTitle>
            <CardDescription>
              {priorityGap
                ? `Closing your ${priorityGap.competency} gap will have the biggest impact.`
                : "You're on track across all competencies."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : recommended.length > 0 ? (
              recommended.map((c) => (
                <Link
                  key={c.id}
                  href={`/trainee/courses/${c.id}`}
                  className="block rounded-md border border-border p-3 text-sm hover:border-primary/40"
                >
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.durationHours}h · {c.difficulty}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No new recommendations right now.</p>
            )}
              <Button
                render={<Link href="/trainee/courses" />}
                nativeButton={false}
                variant="outline"
                className="w-full"
              >
                Browse all courses
              </Button>
          </CardContent>
        </Card>
      </div>

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
