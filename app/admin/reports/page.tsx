"use client"

import { useEffect, useState } from "react"
import { Activity, CheckCircle2, Target, TrendingUp, type LucideIcon } from "lucide-react"
import { auth } from "@/lib/firebase/config"
import { CompetencyGapChart, ParticipationCompletionChart, AssessmentPerformanceChart, type AssessmentDatum, type GapDatum, type ParticipationDatum } from "@/components/analytics-charts"
import { COMPETENCIES, type AppUser, type AssessmentAttempt, type Certificate, type CompetencyRecord, type Enrollment, type Evidence } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface ReportData { users: AppUser[]; courses: { id: string; title: string }[]; enrollments: Enrollment[]; attempts: AssessmentAttempt[]; records: CompetencyRecord[]; evidence: Evidence[]; certificates: Certificate[] }
interface SummaryCard { icon: LucideIcon; label: string; value: string | number }

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) throw new Error("Not signed in.")
        const response = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error ?? "Unable to load reports.")
        if (active) setData({ users: payload.users, courses: payload.courses, enrollments: payload.enrollments, attempts: payload.attempts, records: payload.records, evidence: payload.evidence, certificates: payload.certificates })
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load reports.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])
  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
  if (error || !data) return <Card><CardContent className="py-10 text-center"><p className="font-medium">Reports unavailable</p><p className="mt-1 text-sm text-muted-foreground">{error ?? "No report data returned."}</p><Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card>
  const traineeIds = new Set(data.users.filter((user) => user.role === "trainee").map((user) => user.uid))
  const traineeRecords = data.records.filter((record) => traineeIds.has(record.userId))
  const completed = data.enrollments.filter((item) => item.status === "completed").length
  const completionRate = data.enrollments.length ? Math.round((completed / data.enrollments.length) * 100) : 0
  const avgScore = data.attempts.length ? Math.round(data.attempts.reduce((sum, item) => sum + item.score, 0) / data.attempts.length) : 0
  const gaps: GapDatum[] = COMPETENCIES.map((name) => { const scores = traineeRecords.map((record) => record.scores[name]).filter(Boolean); return { label: name, value: scores.length ? Math.round(scores.reduce((sum, score) => sum + Math.max(score.target - score.current, 0), 0) / scores.length) : 0 } })
  const participation: ParticipationDatum[] = Array.from(new Set(data.enrollments.map((item) => item.courseId))).map((courseId) => { const rows = data.enrollments.filter((item) => item.courseId === courseId); return { label: data.courses.find((course) => course.id === courseId)?.title ?? courseId, total: rows.length, completed: rows.filter((item) => item.status === "completed").length } })
  const performance: AssessmentDatum[] = [{ label: "0–59", value: data.attempts.filter((item) => item.score < 60).length }, { label: "60–79", value: data.attempts.filter((item) => item.score >= 60 && item.score < 80).length }, { label: "80–100", value: data.attempts.filter((item) => item.score >= 80).length }]
  const summaryCards: SummaryCard[] = [{ icon: Activity, label: "Active enrollments", value: data.enrollments.filter((item) => item.status === "in-progress").length }, { icon: CheckCircle2, label: "Completion rate", value: `${completionRate}%` }, { icon: TrendingUp, label: "Assessment performance", value: `${avgScore}%` }, { icon: Target, label: "Verified evidence", value: data.evidence.filter((item) => item.status === "verified").length }]
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-semibold">Reports & analytics</h1><p className="text-sm text-muted-foreground">All metrics and charts are calculated from live Firestore records.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{summaryCards.map(({ icon: Icon, label, value }) => <Card key={label}><CardContent className="p-4"><Icon className="size-5 text-primary" /><p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div><div className="grid gap-6 xl:grid-cols-2"><CompetencyGapChart data={gaps} /><ParticipationCompletionChart data={participation} /><AssessmentPerformanceChart data={performance} /></div></div>
}
