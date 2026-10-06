"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Award, BadgeCheck, BookOpen, Check, ClipboardCheck, Gauge, ShieldCheck, Target } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompetencyBar } from "@/components/competency-bar"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import { listEvidenceForUser } from "@/lib/firebase/evidence"
import { listAttemptsForUser } from "@/lib/firebase/assessments"
import { ensureCompetencyRecord } from "@/lib/firebase/competencies"
import { averageCompetencyAttainment, computeReadinessScore } from "@/lib/competency-math"
import { formatDate } from "@/lib/format"
import type { AssessmentAttempt, Certificate, CompetencyRecord, Evidence } from "@/lib/types"

export default function CertificatesPage() {
  const { appUser } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [competencyRecord, setCompetencyRecord] = useState<CompetencyRecord | null>(null)
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true); setError(null)
    try {
      const [certs, ev, record, traineeAttempts] = await Promise.all([listCertificatesForUser(appUser.uid), listEvidenceForUser(appUser.uid), ensureCompetencyRecord(appUser.uid), listAttemptsForUser(appUser.uid)])
      setCertificates(certs); setEvidence(ev); setCompetencyRecord(record); setAttempts(traineeAttempts)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your live capability passport.")
    } finally { setLoading(false) }
  }, [appUser])

  useEffect(() => { void load() }, [load])

  const verifiedEvidence = evidence.filter((e) => e.status === "verified")
  const readinessScore = computeReadinessScore(
    competencyRecord ? averageCompetencyAttainment(competencyRecord.scores) : 0,
    verifiedEvidence.length,
    certificates.length,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Capability Passport</h1>
        <p className="text-sm text-muted-foreground">
          Your verified record of skills, applied evidence, and earned certificates — built to travel with you.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <Card><CardContent className="py-10 text-center"><p className="font-medium text-destructive">Capability Passport unavailable</p><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card>
      ) : (
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary to-accent" />
          <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-primary/5 p-4">
              <Gauge className="size-6 text-primary" />
              <p className="text-3xl font-bold text-primary">{readinessScore}%</p>
              <p className="text-xs text-muted-foreground">Job readiness score</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Blends your competency attainment with trainer-verified evidence and certificates — a fuller picture
                than test scores alone.
              </p>
              {competencyRecord &&
                Object.entries(competencyRecord.scores).map(([name, score]) => (
                  <CompetencyBar key={name} label={name} current={score.current} target={score.target} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Your capability journey</CardTitle>
            <CardDescription>One connected record from diagnosis to verified capability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { label: "Competency", detail: competencyRecord ? "Gap identified" : "Start diagnostic", icon: Target, done: Boolean(competencyRecord), href: "/trainee/competency-check" },
                { label: "Learning", detail: "Courses & practice", icon: BookOpen, done: evidence.length > 0 || attempts.length > 0, href: "/trainee/learning-path" },
                { label: "Assessment", detail: attempts.length ? `${attempts.length} attempt${attempts.length === 1 ? "" : "s"}` : "Not attempted", icon: ClipboardCheck, done: attempts.length > 0, href: "/trainee/assessments" },
                { label: "Applied evidence", detail: evidence.length ? `${verifiedEvidence.length} verified` : "Submit workplace proof", icon: BadgeCheck, done: verifiedEvidence.length > 0, href: "/trainee/my-learning" },
                { label: "Certification", detail: certificates.length ? `${certificates.length} issued` : "Earn your passport", icon: Award, done: certificates.length > 0, href: "/trainee/certificates" },
              ].map((step, index) => { const Icon = step.icon; return <Link key={step.label} href={step.href} className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/60 hover:bg-muted/30 md:min-h-32">{index < 4 && <span className="absolute left-full top-8 z-10 hidden h-px w-3 bg-border md:block" />}<div className={`flex size-9 items-center justify-center rounded-full ${step.done ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>{step.done ? <Check className="size-4" /> : <Icon className="size-4" />}</div><p className="mt-3 text-sm font-medium">{step.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p></Link> })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-primary" /> Certificates
            </CardTitle>
            <CardDescription>Earned by completing courses and passing assessments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Complete a course to earn your first certificate.</p>
            ) : (
              certificates.map((cert) => (
                <div key={cert.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium leading-tight">{cert.courseTitle}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(cert.issuedAt)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" /> Certificate ID: {cert.certId}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="size-4 text-success" /> Verified evidence
            </CardTitle>
            <CardDescription>Applied work your trainers have reviewed and confirmed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : verifiedEvidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Submit evidence from a course page to build a verified track record.
              </p>
            ) : (
              verifiedEvidence.map((ev) => (
                <div key={ev.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium leading-tight">{ev.title}</p>
                    <span className="text-xs text-muted-foreground">{ev.reviewedAt ? formatDate(ev.reviewedAt) : ""}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ev.competency} · {ev.courseTitle}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
