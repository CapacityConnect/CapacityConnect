"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ClipboardCheck, Target } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/lib/firebase/config"
import { ensureCompetencyRecord, getPriorityGap, getCompetencyRecord } from "@/lib/firebase/competencies"
import { COMPETENCIES, type CompetencyRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const QUESTIONS = [
  "I can select an appropriate method for a real workplace task.",
  "I can explain my choice using evidence rather than assumptions.",
  "I can identify quality risks before acting on information.",
  "I can communicate the result to a non-specialist colleague.",
  "I can apply the skill independently to a new scenario.",
]
const OPTIONS = ["Not yet", "With guidance", "Usually", "Confidently"]

export default function CompetencyCheckPage() {
  const { appUser } = useAuth()
  const [record, setRecord] = useState<CompetencyRecord | null>(null)
  const [competency, setCompetency] = useState<string>(COMPETENCIES[0])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; before: number; after: number; improvement: number } | null>(null)
  const priorityGap = useMemo(() => getPriorityGap(record), [record])

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCompetencyRecord(appUser.uid)
      setRecord(data)
      if (data) setCompetency(getPriorityGap(data)?.competency ?? COMPETENCIES[0])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your live competency record.")
    } finally {
      setLoading(false)
    }
  }, [appUser])

  useEffect(() => { void load() }, [load])

  async function submit() {
    if (!appUser || Object.keys(answers).length !== QUESTIONS.length) return
    setSubmitting(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error("Your session has expired. Please sign in again.")
      const res = await fetch("/api/competency-check/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ competency, answers: QUESTIONS.map((_, i) => answers[i]) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Unable to save the competency check.")
      setResult({ score: data.diagnosticScore, before: data.before, after: data.after, improvement: data.improvement })
      setRecord(await ensureCompetencyRecord(appUser.uid))
      toast.success("Diagnostic saved to your competency record.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the competency check.")
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-48 w-full" /></div>
  if (error) return <Card><CardContent className="py-10 text-center"><p className="font-medium text-destructive">Competency check unavailable</p><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card>
  const selected = record?.scores?.[competency]
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div><h1 className="text-2xl font-semibold">Competency check</h1><p className="text-sm text-muted-foreground">A deterministic self-diagnostic that updates one tracked competency using your answers.</p></div>
      {priorityGap && <Card className="border-primary/20 bg-primary/5"><CardContent className="flex items-start gap-3 p-4"><Target className="mt-0.5 size-5 text-primary" /><div><p className="font-medium">Your highest-priority gap is {priorityGap.competency}</p><p className="text-sm text-muted-foreground">You are at {priorityGap.current}% against a {priorityGap.target}% target, a {priorityGap.gap}-point gap. Closing it first has the biggest measurable impact on readiness.</p></div></CardContent></Card>}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-5 text-primary" /> Check a competency</CardTitle><CardDescription>Choose the competency, then answer every statement honestly. There is no hidden AI scoring: each answer maps to a transparent percentage.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="max-w-sm"><p className="mb-2 text-sm font-medium">Competency</p><Select value={competency} onValueChange={(value) => { setCompetency(value ?? COMPETENCIES[0]); setAnswers({}); setResult(null) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMPETENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        {selected && <div className="flex flex-wrap gap-2"><Badge variant="outline">Current {selected.current}%</Badge><Badge variant="outline">Target {selected.target}%</Badge><Badge variant="secondary">Gap {Math.max(selected.target - selected.current, 0)} points</Badge></div>}
        <div className="space-y-4">{QUESTIONS.map((question, index) => <div key={question} className="rounded-lg border p-4"><p className="mb-3 text-sm font-medium">{index + 1}. {question}</p><Select value={answers[index]?.toString()} onValueChange={(value) => setAnswers((previous) => ({ ...previous, [index]: Number(value) }))}><SelectTrigger><SelectValue placeholder="Choose your confidence" /></SelectTrigger><SelectContent>{OPTIONS.map((option, optionIndex) => <SelectItem key={option} value={optionIndex.toString()}>{option}</SelectItem>)}</SelectContent></Select></div>)}</div>
        <Button onClick={submit} disabled={submitting || Object.keys(answers).length !== QUESTIONS.length}>{submitting ? "Saving…" : "Calculate and save result"}</Button>
        {result && <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4"><CheckCircle2 className="mt-0.5 size-5 text-success" /><div><p className="font-medium">Diagnostic result: {result.score}%</p><p className="text-sm text-muted-foreground">{competency} moved from {result.before}% to {result.after}% ({result.improvement >= 0 ? "+" : ""}{result.improvement}). Your result is now part of the live competency record.</p></div></div>}
      </CardContent></Card>
    </div>
  )
}
