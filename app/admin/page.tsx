"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, Award, BarChart3, BookOpen, Database, FileCheck2, GraduationCap, UserCheck, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StatCard } from "@/components/stat-card"
import { CompetencyBar } from "@/components/competency-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { listCourses } from "@/lib/firebase/courses"
import { listPendingUsers, listUsers } from "@/lib/firebase/users"
import { seedDemoData } from "@/lib/firebase/seed"
import { listAllCompetencyRecords } from "@/lib/firebase/competencies"
import { listAllCertificates } from "@/lib/firebase/certificates"
import { COMPETENCIES } from "@/lib/types"
import type { AppUser, Certificate, CompetencyRecord, CompetencyScore, Course } from "@/lib/types"

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [pending, setPending] = useState<AppUser[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [competencyRecords, setCompetencyRecords] = useState<CompetencyRecord[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  async function load() {
    const [u, p, c, cr, cert] = await Promise.all([
      listUsers(),
      listPendingUsers(),
      listCourses(),
      listAllCompetencyRecords(),
      listAllCertificates(),
    ])
    setUsers(u)
    setPending(p)
    setCourses(c)
    setCompetencyRecords(cr)
    setCertificates(cert)
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

  const traineeCount = users.filter((u) => u.role === "trainee").length
  const trainerCount = users.filter((u) => u.role === "trainer").length

  const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollmentCount, 0)

  const orgAverages = COMPETENCIES.map((name) => {
    const scores = competencyRecords.map((r) => r.scores[name]).filter((s): s is CompetencyScore => !!s)
    if (scores.length === 0) return { name, current: 0, target: 80 }
    return {
      name,
      current: Math.round(scores.reduce((sum, s) => sum + s.current, 0) / scores.length),
      target: Math.round(scores.reduce((sum, s) => sum + s.target, 0) / scores.length),
    }
  })
  const overallAvgGap =
    orgAverages.length > 0
      ? Math.round(orgAverages.reduce((sum, a) => sum + Math.max(a.target - a.current, 0), 0) / orgAverages.length)
      : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Platform overview</h1>
          <p className="text-sm text-muted-foreground">Monitor usage and manage the platform.</p>
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seeding}>
          <Database className="size-4" /> Seed demo data
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Trainees" value={traineeCount} icon={Users} />
          <StatCard label="Trainers" value={trainerCount} icon={GraduationCap} />
          <StatCard label="Courses" value={courses.length} icon={BookOpen} />
          <StatCard label="Pending approvals" value={pending.length} icon={UserCheck} />
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Certificates issued" value={certificates.length} icon={Award} />
          <StatCard label="Enrollments" value={totalEnrollments} icon={FileCheck2} />
        </div>
      )}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-primary" /> Org-wide competency levels
              </CardTitle>
              <CardDescription>Average current level vs. target across all trainees, per competency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {competencyRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No competency data yet.</p>
              ) : (
                orgAverages.map((a) => <CompetencyBar key={a.name} label={a.name} current={a.current} target={a.target} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-accent" /> Engagement
              </CardTitle>
              <CardDescription>Platform-wide learning activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-muted-foreground">Total enrollments</span>
                <span className="font-semibold">{totalEnrollments}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-muted-foreground">Avg. competency gap</span>
                <span className="font-semibold">{overallAvgGap}%</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-muted-foreground">Trainees tracked</span>
                <span className="font-semibold">{competencyRecords.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map((u) => (
              <div key={u.uid} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.email} · {u.role}
                  </p>
                </div>
                    <Button
                      render={<Link href="/admin/user-approval" />}
                      nativeButton={false}
                      size="sm"
                      variant="outline"
                    >
                      Review
                    </Button>
              </div>
            ))}
            {pending.length > 5 && (
              <Button
                render={<Link href="/admin/user-approval" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                View all {pending.length} pending
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
