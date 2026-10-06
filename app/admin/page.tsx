"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Activity, Award, BookOpen, Database, FileCheck2, GraduationCap, UserCheck, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { auth } from "@/lib/firebase/config"
import { CompetencyGapChart, ParticipationCompletionChart, AssessmentPerformanceChart, type AssessmentDatum, type GapDatum, type ParticipationDatum } from "@/components/analytics-charts"
import type { AppUser, AssessmentAttempt, Certificate, CompetencyRecord, Course, Enrollment, Evidence } from "@/lib/types"

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [pending, setPending] = useState<AppUser[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [competencyRecords, setCompetencyRecords] = useState<CompetencyRecord[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error("Not signed in.")
      const response = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? "Unable to load live admin data.")
      const { users: allUsers, courses: liveCourses, records, certificates: liveCertificates, enrollments: liveEnrollments, attempts: liveAttempts, evidence: liveEvidence } = payload
      const pendingUsers = (allUsers as AppUser[]).filter((user) => user.status === "pending")
      setUsers(allUsers); setPending(pendingUsers); setCourses(liveCourses); setCompetencyRecords(records); setCertificates(liveCertificates); setEnrollments(liveEnrollments); setAttempts(liveAttempts); setEvidence(liveEvidence)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load live Firebase admin data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSeed() {
    if (!appUser) return
    setSeeding(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch("/api/admin/seed", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? "Failed to seed demo data")
      toast.success(result.seeded ? "Demo data seeded" : result.reason ?? "Demo data already exists")
      await load()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Failed to seed demo data") } finally { setSeeding(false) }
  }

  const traineeIds = new Set(users.filter((user) => user.role === "trainee").map((user) => user.uid))
  const traineeRecords = competencyRecords.filter((record) => traineeIds.has(record.userId))
  const traineeCount = traineeIds.size
  const trainerCount = users.filter((user) => user.role === "trainer").length
  const completedEnrollments = enrollments.filter((item) => item.status === "completed").length
  const totalEnrollments = enrollments.length
  const gapData: GapDatum[] = ["Data Analysis", "Communication", "Digital Skills", "Problem Solving", "Leadership"].map((label) => { const scores = traineeRecords.map((record) => record.scores[label]).filter(Boolean); return { label, value: scores.length ? Math.round(scores.reduce((sum, score) => sum + Math.max(score.target - score.current, 0), 0) / scores.length) : 0 } })
  const participationData: ParticipationDatum[] = courses.map((course) => { const rows = enrollments.filter((item) => item.courseId === course.id); return { label: course.title, total: rows.length, completed: rows.filter((item) => item.status === "completed").length } }).filter((item) => item.total > 0)
  const assessmentData: AssessmentDatum[] = [{ label: "0–59", value: attempts.filter((item) => item.score < 60).length }, { label: "60–79", value: attempts.filter((item) => item.score >= 60 && item.score < 80).length }, { label: "80–100", value: attempts.filter((item) => item.score >= 80).length }]

  return <div className="flex flex-col gap-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Platform overview</h1><p className="text-sm text-muted-foreground">Monitor usage and manage the platform using live Firebase records.</p></div><Button variant="outline" onClick={handleSeed} disabled={seeding}><Database className="size-4" /> {seeding ? "Seeding…" : "Seed demo data"}</Button></div>
    {error && <Card className="border-destructive/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium text-destructive">Live admin data unavailable</p><p className="text-sm text-muted-foreground">{error}</p></div><Button variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card>}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Trainees" value={traineeCount} icon={Users} /><StatCard label="Trainers" value={trainerCount} icon={GraduationCap} /><StatCard label="Courses" value={courses.length} icon={BookOpen} /><StatCard label="Pending approvals" value={pending.length} icon={UserCheck} /><StatCard label="Certificates issued" value={certificates.length} icon={Award} /><StatCard label="Enrollments" value={totalEnrollments} icon={FileCheck2} /><StatCard label="Assessment attempts" value={attempts.length} icon={Activity} /><StatCard label="Verified evidence" value={evidence.filter((item) => item.status === "verified").length} icon={FileCheck2} /></div>}
    {!loading && <div className="grid gap-6 xl:grid-cols-2"><CompetencyGapChart data={gapData} /><ParticipationCompletionChart data={participationData} /><AssessmentPerformanceChart data={assessmentData} /></div>}
    {!loading && pending.length > 0 && <Card><CardHeader><CardTitle className="text-base">Awaiting approval</CardTitle></CardHeader><CardContent className="space-y-2">{pending.slice(0, 5).map((user) => <div key={user.uid} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><div><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email} · {user.role}</p></div><Button render={<Link href="/admin/user-approval" />} nativeButton={false} size="sm" variant="outline">Review</Button></div>)}</CardContent></Card>}
  </div>
}
