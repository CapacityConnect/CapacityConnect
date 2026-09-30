"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Download, FileText, Plus, Star, Upload, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getCourse, listEnrollmentsForCourse } from "@/lib/firebase/courses"
import { listResourcesForCourse, uploadCourseResource } from "@/lib/firebase/resources"
import { createAssessment, getAssessmentForCourse, listAttemptsForAssessment } from "@/lib/firebase/assessments"
import { listFeedbackForCourse } from "@/lib/firebase/feedback"
import { auth } from "@/lib/firebase/config"
import { listUsers } from "@/lib/firebase/users"
import { formatFileSize, formatRelativeTime } from "@/lib/format"
import type { Assessment, AssessmentAttempt, AssessmentQuestionDraft, AppUser, Course, Enrollment, Feedback, Resource } from "@/lib/types"

interface QuestionDraft {
  text: string
  options: string[]
  correctIndex: number
  explanation: string
}

const emptyQuestion: QuestionDraft = { text: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }

export default function TrainerCourseDetailPage() {
  const params = useParams<{ id: string }>()
  const { appUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [course, setCourse] = useState<Course | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [resourceTitle, setResourceTitle] = useState("")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...emptyQuestion }])
  const [assessmentTitle, setAssessmentTitle] = useState("")
  const [assessmentDeadline, setAssessmentDeadline] = useState("")
  const [savingAssessment, setSavingAssessment] = useState(false)
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([])
  const [learners, setLearners] = useState<Record<string, AppUser>>({})

  async function load() {
    const c = await getCourse(params.id)
    if (!c) {
      setLoading(false)
      return
    }
    const [e, r, a, f, allUsers] = await Promise.all([
      listEnrollmentsForCourse(c.id),
      listResourcesForCourse(c.id),
      getAssessmentForCourse(c.id),
      listFeedbackForCourse(c.id),
      listUsers(),
    ])
    setCourse(c)
    setEnrollments(e)
    setResources(r)
    setAssessment(a)
    setFeedback(f)
    setLearners(Object.fromEntries(allUsers.map((u) => [u.uid, u])))
    setAssessmentTitle(`${c.title} — Final Assessment`)
    if (a) {
      const at = await listAttemptsForAssessment(a.id)
      setAttempts(at)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [params.id])

  async function handleUpload(file: File) {
    if (!appUser || !course) return
    if (!resourceTitle.trim()) {
      toast.error("Give the resource a title first.")
      return
    }
    setUploadProgress(0)
    try {
      await uploadCourseResource(
        course.id,
        file,
        { title: resourceTitle, uploadedBy: appUser.uid, uploadedByName: appUser.name },
        (pct) => setUploadProgress(pct),
      )
      const r = await listResourcesForCourse(course.id)
      setResources(r)
      setResourceTitle("")
      toast.success("Resource uploaded")
      const token = await auth.currentUser?.getIdToken()
      fetch(`/api/courses/${course.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: "material", resourceTitle }),
      }).catch(() => {})
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function updateQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, i2) => (i2 === oi ? value : o)) } : q)),
    )
  }

  async function handleCreateAssessment() {
    if (!appUser || !course) return
    const invalid = questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()) || !q.explanation.trim())
    if (invalid) {
      toast.error("Fill in every question, option, and explanation.")
      return
    }
    setSavingAssessment(true)
    const built: AssessmentQuestionDraft[] = questions.map((q, i) => ({
      id: `q${i + 1}`,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }))
    const created = await createAssessment({
      courseId: course.id,
      competency: course.competency,
      title: assessmentTitle,
      deadline: assessmentDeadline ? new Date(assessmentDeadline).getTime() : undefined,
      trainerId: appUser.uid,
      questions: built,
    })
    setAssessment(created)
    setSavingAssessment(false)
    toast.success("Assessment published")
    const token = await auth.currentUser?.getIdToken()
    fetch(`/api/courses/${course.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: "assessment",
        title: created.title,
        deadline: created.deadline,
        assessmentId: created.id,
      }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!course) return <p className="text-sm text-muted-foreground">Course not found.</p>

  const avgRating = feedback.length > 0 ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : "—"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{course.competency}</Badge>
          <Badge variant="outline">{course.difficulty}</Badge>
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{course.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{course.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="size-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Star className="size-5 text-accent" />
            <div>
              <p className="text-xl font-semibold">{avgRating}</p>
              <p className="text-xs text-muted-foreground">Avg. rating ({feedback.length})</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="size-5 text-success" />
            <div>
              <p className="text-xl font-semibold">{course.modules.length}</p>
              <p className="text-xs text-muted-foreground">Modules</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {course.modules
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <div key={m.id} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">
                    {m.order}. {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.summary}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learner progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollments yet.</p>
            ) : (
              enrollments.map((e) => (
                <div key={e.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{e.status === "completed" ? "Completed" : "In progress"}</span>
                    <span>{e.progress}%</span>
                  </div>
                  <Progress value={e.progress} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm hover:border-primary/40"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(r.fileSize)}</span>
                <Download className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
              <Label htmlFor="resource-title" className="text-xs">
                Resource title
              </Label>
              <Input
                id="resource-title"
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                placeholder="e.g. Module 1 slides"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={uploadProgress !== null}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" /> {uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Upload file"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              feedback.slice(0, 5).map((f) => (
                <div key={f.id} className="rounded-md border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{f.userName}</span>
                    <span className="flex items-center gap-1 text-accent">
                      <Star className="size-3.5 fill-accent" /> {f.rating}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.comment || "No comment"}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(f.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{assessment.title}</p>
                <p className="text-sm text-muted-foreground">
                  {assessment.questions.length} questions published.
                  {assessment.deadline ? ` Deadline: ${new Date(assessment.deadline).toLocaleDateString()}.` : ""}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Trainee performance</Label>
                {attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attempts submitted yet.</p>
                ) : (
                  attempts
                    .sort((a, b) => b.submittedAt - a.submittedAt)
                    .map((a) => {
                      const learner = learners[a.userId]
                      return (
                        <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                          <span>{learner?.name ?? a.userId}</span>
                          <span className="font-medium">
                            {a.correctCount}/{a.totalQuestions} · {a.score}%
                          </span>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="assessment-title">Assessment title</Label>
                  <Input id="assessment-title" value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assessment-deadline">Deadline (optional)</Label>
                  <Input
                    id="assessment-deadline"
                    type="date"
                    value={assessmentDeadline}
                    onChange={(e) => setAssessmentDeadline(e.target.value)}
                  />
                </div>
              </div>
              {questions.map((q, qi) => (
                <div key={qi} className="space-y-3 rounded-md border border-border p-4">
                  <Label className="text-xs text-muted-foreground">Question {qi + 1}</Label>
                  <Input
                    placeholder="Question text"
                    value={q.text}
                    onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  />
                  <RadioGroup
                    value={q.correctIndex.toString()}
                    onValueChange={(v) => updateQuestion(qi, { correctIndex: Number(v) })}
                    className="gap-2"
                  >
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <RadioGroupItem value={oi.toString()} id={`q${qi}-${oi}`} />
                        <Input
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                        />
                      </div>
                    ))}
                  </RadioGroup>
                  <Textarea
                    placeholder="Explanation for the correct answer"
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                    rows={2}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuestions((prev) => [...prev, { ...emptyQuestion, options: ["", "", "", ""] }])}>
                  <Plus className="size-4" /> Add question
                </Button>
                <Button size="sm" disabled={savingAssessment} onClick={handleCreateAssessment}>
                  Publish assessment
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
