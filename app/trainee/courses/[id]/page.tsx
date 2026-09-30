"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Circle, Clock, Download, FileText, Star, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  enrollInCourse,
  getCourse,
  getEnrollment,
  markModuleComplete,
} from "@/lib/firebase/courses"
import { listResourcesForCourse } from "@/lib/firebase/resources"
import { getAssessmentForCourse } from "@/lib/firebase/assessments"
import { checkForCertificate } from "@/lib/firebase/certificates"
import { submitFeedback } from "@/lib/firebase/feedback"
import { formatFileSize } from "@/lib/format"
import { auth } from "@/lib/firebase/config"
import type { Assessment, Course, Enrollment, Resource } from "@/lib/types"

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { appUser } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    async function load() {
      const c = await getCourse(params.id)
      if (!mounted || !c) {
        setLoading(false)
        return
      }
      const [e, r, a] = await Promise.all([
        getEnrollment(appUser!.uid, c.id),
        listResourcesForCourse(c.id),
        getAssessmentForCourse(c.id),
      ])
      if (!mounted) return
      setCourse(c)
      setEnrollment(e)
      setResources(r)
      setAssessment(a)
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [appUser, params.id])

  async function handleEnroll() {
    if (!appUser || !course) return
    const e = await enrollInCourse(appUser.uid, course.id)
    setEnrollment(e)
    setCourse({ ...course, enrollmentCount: course.enrollmentCount + 1 })
    toast.success("Enrolled! Start with the first module.")
  }

  async function handleToggleModule(moduleId: string) {
    if (!appUser || !course || !enrollment) return
    if (enrollment.completedModules.includes(moduleId)) return
    await markModuleComplete(appUser.uid, course.id, moduleId, course.modules.length)
    const refreshed = await getEnrollment(appUser.uid, course.id)
    setEnrollment(refreshed)
    if (refreshed?.status === "completed") {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (token) await checkForCertificate(token, course.id)
        toast.success("Course complete! Your certificate has been issued.")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Course complete, but certificate issuance failed.")
      }
    }
  }

  async function handleSubmitFeedback() {
    if (!appUser || !course) return
    setSubmittingFeedback(true)
    await submitFeedback({
      courseId: course.id,
      courseTitle: course.title,
      userId: appUser.uid,
      userName: appUser.name,
      rating,
      comment,
    })
    setSubmittingFeedback(false)
    setComment("")
    toast.success("Thanks for your feedback!")
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!course) {
    return <p className="text-sm text-muted-foreground">Course not found.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{course.competency}</Badge>
          <Badge variant="outline">{course.difficulty}</Badge>
        </div>
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{course.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {course.durationHours}h
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {course.enrollmentCount} enrolled
          </span>
          <span>
            By <span className="font-medium text-foreground">{course.trainerName}</span>
          </span>
        </div>
        {!enrollment ? (
          <Button onClick={handleEnroll} className="w-fit">
            Enroll in this course
          </Button>
        ) : (
          <div className="max-w-md space-y-1">
            <Progress value={enrollment.progress} />
            <p className="text-xs text-muted-foreground">
              {enrollment.progress}% complete · {enrollment.status === "completed" ? "Completed" : "In progress"}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {course.modules
              .sort((a, b) => a.order - b.order)
              .map((m) => {
                const done = enrollment?.completedModules.includes(m.id)
                return (
                  <button
                    key={m.id}
                    disabled={!enrollment || done}
                    onClick={() => handleToggleModule(m.id)}
                    className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left text-sm transition-colors disabled:cursor-default enabled:hover:border-primary/40"
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {m.order}. {m.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.summary}</span>
                    </span>
                  </button>
                )
              })}
            {!enrollment && (
              <p className="pt-1 text-xs text-muted-foreground">Enroll to track module progress.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>
              ) : (
                resources.map((r) => (
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
                ))
              )}
            </CardContent>
          </Card>

          {assessment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{assessment.title}</p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!enrollment}
                  onClick={() => router.push(`/trainee/assessments/${assessment.id}`)}
                >
                  {enrollment ? "Take assessment" : "Enroll to unlock"}
                </Button>
              </CardContent>
            </Card>
          )}

          {enrollment?.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Share feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
                      <Star className={`size-5 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="What did you think of this course?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button className="w-full" disabled={submittingFeedback} onClick={handleSubmitFeedback}>
                  Submit feedback
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
