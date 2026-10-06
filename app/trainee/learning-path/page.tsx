"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BadgeCheck, BookOpen, ClipboardCheck, ShieldCheck, Target } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ensureCompetencyRecord, getPriorityGap } from "@/lib/firebase/competencies"
import { listCoursesByCompetency, listEnrollmentsForUser } from "@/lib/firebase/courses"
import { getAssessmentForCourse, getAttempt } from "@/lib/firebase/assessments"
import { listEvidenceForCourse } from "@/lib/firebase/evidence"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import type { Assessment, Certificate, Course, Enrollment, Evidence, CompetencyRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

interface PathItem { course: Course; enrollment: Enrollment | null; assessment: Assessment | null; attemptScore: number | null; evidence: Evidence[]; certificate: Certificate | null }
export default function LearningPathPage() {
  const { appUser } = useAuth()
  const [record, setRecord] = useState<CompetencyRecord | null>(null)
  const [items, setItems] = useState<PathItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!appUser) return
    const uid = appUser.uid
    let active = true
    async function load() {
      try {
        const [competency, courses, enrollments, certificates] = await Promise.all([
          ensureCompetencyRecord(uid),
          listCoursesByCompetency(getPriorityGap(await ensureCompetencyRecord(uid))?.competency ?? "Data Analysis"),
          listEnrollmentsForUser(uid),
          listCertificatesForUser(uid),
        ])
        const result = await Promise.all(courses.slice(0, 3).map(async (course) => {
          const enrollment = enrollments.find((item) => item.courseId === course.id) ?? null
          const assessment = await getAssessmentForCourse(course.id)
          const attempt = assessment ? await getAttempt(assessment.id, uid) : null
          const evidence = enrollment ? await listEvidenceForCourse(uid, course.id) : []
          return { course, enrollment, assessment, attemptScore: attempt?.score ?? null, evidence, certificate: certificates.find((item) => item.courseId === course.id) ?? null }
        }))
        if (active) { setRecord(competency); setItems(result) }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load your learning path.")
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [appUser])
  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>
  if (error) return <Card><CardContent className="py-10 text-center"><p className="font-medium">Learning path unavailable</p><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card>
  const gap = getPriorityGap(record)
  return <div className="mx-auto flex max-w-5xl flex-col gap-6">
    <div><h1 className="text-2xl font-semibold">Your learning path</h1><p className="text-sm text-muted-foreground">A live, explainable route from your largest competency gap to verified readiness.</p></div>
    <div className="grid gap-4 md:grid-cols-4">{[
      [Target, "Gap identified", gap ? `${gap.competency} · ${gap.gap} pts` : "On target"],
      [BookOpen, "Recommended courses", `${items.length}`],
      [ClipboardCheck, "Assessment", items.some((item) => item.attemptScore !== null) ? "Attempt recorded" : "Next milestone"],
      [ShieldCheck, "Readiness proof", `${items.filter((item) => item.evidence.some((e) => e.status === "verified") || item.certificate).length} verified`],
    ].map(([Icon, label, value]) => <Card key={label as string}><CardContent className="p-4"><Icon className="size-5 text-primary" /><p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label as string}</p><p className="mt-1 font-semibold">{value as string}</p></CardContent></Card>)}</div>
    <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="text-base">Why this path?</CardTitle><CardDescription>{gap ? `${gap.competency} is currently ${gap.current}%, against a ${gap.target}% target. The recommendations below directly address your largest gap.` : "Your tracked competencies are at target. Keep building evidence to maintain readiness."}</CardDescription></CardHeader></Card>
    {items.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No live course is mapped to your priority gap yet. Browse all courses or ask an administrator to add coverage.</CardContent></Card> : <div className="space-y-4">{items.map((item) => { const verified = item.evidence.some((e) => e.status === "verified"); return <Card key={item.course.id}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><Badge variant="outline">{item.course.competency}</Badge><h2 className="mt-2 text-lg font-semibold">{item.course.title}</h2><p className="mt-1 text-sm text-muted-foreground">This course directly addresses the largest identified gap.</p></div><Button render={<Link href={`/trainee/courses/${item.course.id}`} />} nativeButton={false} variant="outline">Open course <ArrowRight className="size-4" /></Button></div><div className="mt-5 grid gap-3 md:grid-cols-4"><div><p className="text-xs text-muted-foreground">Learning</p><p className="font-medium">{item.enrollment ? `${item.enrollment.progress}% complete` : "Not enrolled"}</p>{item.enrollment && <Progress value={item.enrollment.progress} className="mt-2" />}</div><div><p className="text-xs text-muted-foreground">Assessment</p><p className="font-medium">{item.assessment ? (item.attemptScore === null ? "Ready to take" : `${item.attemptScore}% recorded`) : "Not published"}</p></div><div><p className="text-xs text-muted-foreground">Evidence</p><p className="font-medium">{verified ? "Trainer verified" : item.evidence.length ? "Under review" : "Submit after learning"}</p></div><div><p className="text-xs text-muted-foreground">Readiness</p><p className="flex items-center gap-1 font-medium">{item.certificate ? <><BadgeCheck className="size-4 text-success" /> Certified</> : "Build proof next"}</p></div></div></CardContent></Card> })}</div>}
  </div>
}
