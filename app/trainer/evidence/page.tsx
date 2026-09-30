"use client"

import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, CheckCircle2, ShieldAlert } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/lib/format"
import { listEvidenceForTrainer, reviewEvidence } from "@/lib/firebase/evidence"
import type { Evidence, EvidenceStatus } from "@/lib/types"

const STATUS_LABEL: Record<EvidenceStatus, string> = {
  pending: "Pending",
  "needs-revision": "Needs revision",
  verified: "Verified",
}

export default function TrainerEvidencePage() {
  const { appUser } = useAuth()
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<EvidenceStatus | "all">("pending")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!appUser) return
    listEvidenceForTrainer(appUser.uid).then((list) => {
      setEvidence(list)
      setLoading(false)
    })
  }, [appUser])

  const filtered = useMemo(
    () => (tab === "all" ? evidence : evidence.filter((e) => e.status === tab)),
    [evidence, tab],
  )
  const pendingCount = evidence.filter((e) => e.status === "pending").length

  async function handleReview(ev: Evidence, status: EvidenceStatus) {
    setBusyId(ev.id)
    try {
      const note = notes[ev.id]?.trim()
      await reviewEvidence(ev.id, status, note)
      setEvidence((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, status, reviewNote: note, reviewedAt: Date.now() } : item)),
      )
      toast.success(status === "verified" ? "Evidence verified" : "Sent back for revision")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update evidence.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardShell role="trainer">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Evidence Review</h1>
          <p className="text-sm text-muted-foreground">
            Verify proof of applied skill your trainees submit against your courses.
            {pendingCount > 0 && ` ${pendingCount} awaiting your review.`}
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as EvidenceStatus | "all")}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="needs-revision">Needs revision</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No evidence in this category.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((ev) => (
              <Card key={ev.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{ev.title}</CardTitle>
                    <Badge variant="secondary">{STATUS_LABEL[ev.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ev.userName} · {ev.courseTitle} · {ev.competency} · submitted {formatDate(ev.createdAt)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{ev.description}</p>
                  {ev.fileUrl && (
                    <a
                      href={ev.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary underline"
                    >
                      View submitted link
                    </a>
                  )}
                  {ev.status !== "verified" && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Optional note for the trainee..."
                        value={notes[ev.id] ?? ev.reviewNote ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [ev.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === ev.id}
                          onClick={() => handleReview(ev, "verified")}
                        >
                          <CheckCircle2 className="size-4" /> Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === ev.id}
                          onClick={() => handleReview(ev, "needs-revision")}
                        >
                          <ShieldAlert className="size-4" /> Request revision
                        </Button>
                      </div>
                    </div>
                  )}
                  {ev.status === "verified" && (
                    <p className="flex items-center gap-1.5 text-xs text-success">
                      <BadgeCheck className="size-3.5" /> Verified {ev.reviewedAt ? formatDate(ev.reviewedAt) : ""}
                      {ev.reviewNote ? ` — ${ev.reviewNote}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
