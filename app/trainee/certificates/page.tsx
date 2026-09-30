"use client"

import { useEffect, useState } from "react"
import { Award, BadgeCheck, Gauge, ShieldCheck } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CompetencyBar } from "@/components/competency-bar"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import { listEvidenceForUser } from "@/lib/firebase/evidence"
import { ensureCompetencyRecord } from "@/lib/firebase/competencies"
import { averageCompetencyAttainment, computeReadinessScore } from "@/lib/competency-math"
import { formatDate } from "@/lib/format"
import type { Certificate, CompetencyRecord, Evidence } from "@/lib/types"

export default function CertificatesPage() {
  const { appUser } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [competencyRecord, setCompetencyRecord] = useState<CompetencyRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    Promise.all([
      listCertificatesForUser(appUser.uid),
      listEvidenceForUser(appUser.uid),
      ensureCompetencyRecord(appUser.uid),
    ]).then(([certs, ev, record]) => {
      if (!mounted) return
      setCertificates(certs)
      setEvidence(ev)
      setCompetencyRecord(record)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [appUser])

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
