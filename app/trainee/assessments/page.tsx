"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ClipboardList } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getAssessmentForCourse, getAttempt } from "@/lib/firebase/assessments"
import { getCourse, listEnrollmentsForUser } from "@/lib/firebase/courses"
import type { Assessment, AssessmentAttempt, Course } from "@/lib/types"

interface Row {
  course: Course
  assessment: Assessment
  attempt: AssessmentAttempt | null
}

export default function TraineeAssessmentsPage() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    async function load() {
      const enrollments = await listEnrollmentsForUser(appUser!.uid)
      const results: Row[] = []
      for (const e of enrollments) {
        const course = await getCourse(e.courseId)
        if (!course) continue
        const assessment = await getAssessmentForCourse(course.id)
        if (!assessment) continue
        const attempt = await getAttempt(assessment.id, appUser!.uid)
        results.push({ course, assessment, attempt })
      }
      if (mounted) {
        setRows(results)
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [appUser])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <p className="text-sm text-muted-foreground">Complete assessments to update your competency scores.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Enroll in a course to unlock its assessment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ course, assessment, attempt }) => (
            <Card key={assessment.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4 text-primary" /> {assessment.title}
                  </CardTitle>
                  {attempt && (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                      Completed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {course.title} · {assessment.questions.length} questions · {assessment.competency}
                </p>
                {attempt ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-success" />
                    Scored {attempt.score}% ({attempt.correctCount}/{attempt.totalQuestions})
                  </div>
                ) : null}
                <Button
                  render={<Link href={`/trainee/assessments/${assessment.id}`} />}
                  nativeButton={false}
                  variant={attempt ? "outline" : "default"}
                  className="w-full"
                >
                  {attempt ? "Review attempt" : "Take assessment"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
