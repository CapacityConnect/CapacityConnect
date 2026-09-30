"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, TrendingUp, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { getAssessment, getAttempt, submitAssessmentAttempt } from "@/lib/firebase/assessments"
import { auth } from "@/lib/firebase/config"
import { toast } from "sonner"
import type { Assessment, AssessmentAttempt } from "@/lib/types"

export default function TakeAssessmentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { appUser } = useAuth()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    async function load() {
      const a = await getAssessment(params.id)
      if (!a) {
        setLoading(false)
        return
      }
      const existing = await getAttempt(a.id, appUser!.uid)
      if (!mounted) return
      setAssessment(a)
      setAttempt(existing)
      if (existing) {
        setAnswers(Object.fromEntries(a.questions.map((q, i) => [q.id, existing.answers[i]])))
      }
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [appUser, params.id])

  async function handleSubmit() {
    if (!appUser || !assessment) return
    setSubmitting(true)
    try {
      const orderedAnswers = assessment.questions.map((q) => answers[q.id] ?? -1)
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error("Not signed in.")
      const { attempt: result } = await submitAssessmentAttempt(token, assessment.id, orderedAnswers)
      setAttempt(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit assessment.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!assessment) return <p className="text-sm text-muted-foreground">Assessment not found.</p>

  const allAnswered = assessment.questions.every((q) => answers[q.id] !== undefined)

  if (attempt) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push("/trainee/assessments")}>
          Back to assessments
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Result: {assessment.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-3xl font-semibold">{attempt.score}%</p>
                <p className="text-sm text-muted-foreground">
                  {attempt.correctCount} / {attempt.totalQuestions} correct
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                <TrendingUp className="size-4 text-success" />
                <span>
                  {assessment.competency}: {attempt.competencyBefore}% &rarr; {attempt.competencyAfter}% (
                  {attempt.improvement >= 0 ? "+" : ""}
                  {attempt.improvement})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {assessment.questions.map((q, i) => {
            const item = attempt.review.find((r) => r.questionId === q.id)
            if (!item) return null
            return (
              <Card key={q.id}>
                <CardContent className="space-y-2 p-4">
                  <p className="flex items-start gap-2 text-sm font-medium">
                    {item.correct ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    {i + 1}. {q.text}
                  </p>
                  <div className="space-y-1 pl-6 text-sm">
                    {q.options.map((opt, oi) => (
                      <p
                        key={oi}
                        className={
                          oi === item.correctIndex
                            ? "font-medium text-success"
                            : oi === item.chosenIndex
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {opt}
                      </p>
                    ))}
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground">{item.explanation}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{assessment.title}</h1>
        <p className="text-sm text-muted-foreground">{assessment.questions.length} questions · {assessment.competency}</p>
      </div>

      <div className="space-y-4">
        {assessment.questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {i + 1}. {q.text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[q.id]?.toString()}
                onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: Number(v) }))}
                className="gap-2"
              >
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <RadioGroupItem value={oi.toString()} id={`${q.id}-${oi}`} />
                    <Label htmlFor={`${q.id}-${oi}`} className="cursor-pointer text-sm font-normal">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button disabled={!allAnswered || submitting} onClick={handleSubmit} className="w-fit">
        Submit assessment <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}
