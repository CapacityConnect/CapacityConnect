"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Target, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompetencyBar } from "@/components/competency-bar"
import { ensureCompetencyRecord, getAllGaps } from "@/lib/firebase/competencies"
import { listCoursesByCompetency } from "@/lib/firebase/courses"
import { listUsersByRole } from "@/lib/firebase/users"
import type { AppUser, Course } from "@/lib/types"
import { LiveDataError } from "@/components/live-data-state"

interface GapMatch {
  competency: string
  current: number
  target: number
  gap: number
  trainers: AppUser[]
  courses: Course[]
}

export default function FindTrainerPage() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<GapMatch[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true); setError(null)
    try {
      const [record, trainers] = await Promise.all([ensureCompetencyRecord(appUser.uid), listUsersByRole("trainer")])
      const approvedTrainers = trainers.filter((trainer) => trainer.status === "approved")
      const results = await Promise.all(getAllGaps(record).map(async (gap) => ({ ...gap, trainers: approvedTrainers.filter((trainer) => trainer.expertise?.some((item) => item.toLowerCase() === gap.competency.toLowerCase())), courses: await listCoursesByCompetency(gap.competency) })))
      setMatches(results)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load live trainer matches.") }
    finally { setLoading(false) }
  }, [appUser])
  useEffect(() => { void load() }, [load])

  return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Find a Trainer</h1>
          <p className="text-sm text-muted-foreground">
            Matched to your competency gaps: trainers whose listed expertise covers the skills you need most, and the
            courses they run in that area.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : error ? (
          <LiveDataError message={error} onRetry={() => void load()} />
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              You&apos;re meeting target on every tracked competency. No trainer matching needed right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((m) => (
              <Card key={m.competency}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="size-4 text-primary" /> {m.competency}
                    </CardTitle>
                    <Badge variant="secondary">{m.gap}pt gap</Badge>
                  </div>
                  <CardDescription>
                    <CompetencyBar label="" current={m.current} target={m.target} />
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Users className="size-4" /> Matching trainers
                    </p>
                    {m.trainers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No approved trainer currently lists this expertise yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {m.trainers.map((t) => (
                          <Badge key={t.uid} variant="outline">
                            {t.name}
                            {t.designation ? ` · ${t.designation}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Courses in this area</p>
                    {m.courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No live courses in this competency yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {m.courses.slice(0, 3).map((c) => (
                          <Link
                            key={c.id}
                            href={`/trainee/courses/${c.id}`}
                            className="block rounded-md border border-border p-3 text-sm hover:border-primary/40"
                          >
                            <p className="font-medium">{c.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.trainerName} · {c.durationHours}h · {c.difficulty}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button render={<Link href="/trainee/courses" />} nativeButton={false} variant="outline" size="sm">
                    Browse all {m.competency} courses
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  )
}
