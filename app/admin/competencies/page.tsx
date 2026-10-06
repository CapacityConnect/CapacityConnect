"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listCourses } from "@/lib/firebase/courses"
import { listUsersByRole } from "@/lib/firebase/users"
import { listAllCompetencyRecords } from "@/lib/firebase/competencies"
import { COMPETENCIES } from "@/lib/types"
import type { AppUser, Course } from "@/lib/types"
import { LiveDataError } from "@/components/live-data-state"

export default function CompetencyMappingPage() {
  const [trainers, setTrainers] = useState<AppUser[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [demand, setDemand] = useState<Record<string, { traineeCount: number; avgGap: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
      setLoading(true); setError(null)
      try {
        const [trainers, allCourses, records] = await Promise.all([
          listUsersByRole("trainer"), listCourses(), listAllCompetencyRecords(),
        ])
        const byCompetency: Record<string, { total: number; count: number }> = {}
        for (const record of records) {
          for (const [competency, score] of Object.entries(record.scores)) {
            const gap = score.target - score.current
            if (gap <= 0) continue
            byCompetency[competency] ??= { total: 0, count: 0 }
            byCompetency[competency].total += gap
            byCompetency[competency].count += 1
          }
        }
        const demandSummary = Object.fromEntries(
          Object.entries(byCompetency).map(([competency, values]) => [competency, { traineeCount: values.count, avgGap: Math.round(values.total / values.count) }]),
        )
        setTrainers(trainers.filter((trainer) => trainer.status === "approved"))
        setCourses(allCourses)
        setDemand(demandSummary)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load live competency coverage.")
      } finally { setLoading(false) }
    }, [])
    useEffect(() => { void load() }, [load])

  return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Competency Coverage</h1>
          <p className="text-sm text-muted-foreground">
            Demand (trainees with an open gap) against supply (approved trainers and live courses) for each
            competency area, so gaps in coverage are easy to spot.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <LiveDataError message={error} onRetry={() => void load()} />
        ) : Object.keys(demand).length === 0 && trainers.length === 0 && courses.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No competency coverage data yet.</p>
        ) : (
          <div className="space-y-4">
            {COMPETENCIES.map((competency) => {
              const matches = trainers.filter((t) => t.expertise?.some((e) => e.toLowerCase() === competency.toLowerCase()))
              const coverage = courses.filter((c) => c.competency === competency).length
              const demandStats = demand[competency]
              const underserved = (demandStats?.traineeCount ?? 0) > 0 && matches.length === 0
              return (
                <Card key={competency} className={underserved ? "border-destructive/40" : undefined}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">{competency}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={underserved ? "destructive" : "secondary"}>
                          {demandStats?.traineeCount ?? 0} trainee{demandStats?.traineeCount === 1 ? "" : "s"} with a
                          gap
                        </Badge>
                        <Badge variant="secondary">{coverage} live course{coverage === 1 ? "" : "s"}</Badge>
                      </div>
                    </div>
                    {demandStats && (
                      <p className="text-xs text-muted-foreground">Average gap: {demandStats.avgGap} points</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {matches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No approved trainer currently lists this expertise.
                        {underserved ? " Trainees need this now — consider recruiting or reassigning." : ""}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {matches.map((m) => (
                          <Badge key={m.uid} variant="outline">
                            {m.name}
                            {m.designation ? ` · ${m.designation}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
  )
}
