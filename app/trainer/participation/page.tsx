"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { getAssessmentForCourse, listAttemptsForAssessment } from "@/lib/firebase/assessments"
import { listCoursesByTrainer, listEnrollmentsForCourse } from "@/lib/firebase/courses"
import { listUsers } from "@/lib/firebase/users"
import type { AppUser, AssessmentAttempt, Course, Enrollment } from "@/lib/types"

interface CourseParticipation {
  course: Course
  enrollments: Enrollment[]
  attempts: AssessmentAttempt[]
}

export default function TrainerParticipationPage() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<CourseParticipation[]>([])
  const [users, setUsers] = useState<Record<string, AppUser>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    load(appUser.uid)
  }, [appUser])

  async function load(trainerId: string) {
    const [courses, allUsers] = await Promise.all([listCoursesByTrainer(trainerId), listUsers()])
    const userMap: Record<string, AppUser> = {}
    for (const u of allUsers) userMap[u.uid] = u
    setUsers(userMap)

    const result: CourseParticipation[] = []
    for (const course of courses) {
      const enrollments = await listEnrollmentsForCourse(course.id)
      const assessment = await getAssessmentForCourse(course.id).catch(() => null)
      let attempts: AssessmentAttempt[] = []
      if (assessment) attempts = await listAttemptsForAssessment(assessment.id)
      result.push({ course, enrollments, attempts })
    }
    setRows(result)
    setLoading(false)
  }

  const totalTrainees = new Set(rows.flatMap((r) => r.enrollments.map((e) => e.userId))).size
  const totalAttempts = rows.reduce((sum, r) => sum + r.attempts.length, 0)
  const avgScore =
    totalAttempts > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.attempts.reduce((s, a) => s + a.score, 0), 0) / totalAttempts)
      : 0

  return (
    <DashboardShell role="trainer">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Participation & Performance</h1>
          <p className="text-sm text-muted-foreground">
            Track how trainees are progressing and scoring across your courses.
          </p>
        </div>

        {!loading && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trainees reached</p>
                <p className="mt-1 text-2xl font-semibold">{totalTrainees}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Assessments submitted</p>
                <p className="mt-1 text-2xl font-semibold">{totalAttempts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Average score</p>
                <p className="mt-1 text-2xl font-semibold">{avgScore}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading participation data...</p>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You have no courses yet. Create a course to start tracking participation.
            </CardContent>
          </Card>
        ) : (
          rows.map(({ course, enrollments, attempts }) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  <Badge variant="secondary">{enrollments.length} enrolled</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No enrollments yet.</p>
                ) : (
                  enrollments.map((e) => {
                    const learner = users[e.userId]
                    const attempt = attempts.find((a) => a.userId === e.userId)
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{learner?.name ?? e.userId}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={e.progress} className="h-1.5 max-w-40" />
                            <span className="text-xs text-muted-foreground">{e.progress}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {attempt ? (
                            <Badge variant={attempt.score >= 60 ? "default" : "destructive"}>
                              {attempt.correctCount}/{attempt.totalQuestions} · {attempt.score}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No assessment attempt</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardShell>
  )
}
