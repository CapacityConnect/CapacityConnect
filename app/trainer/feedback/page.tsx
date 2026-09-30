"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listCoursesByTrainer } from "@/lib/firebase/courses"
import { listFeedbackForCourse } from "@/lib/firebase/feedback"
import { formatRelativeTime } from "@/lib/format"
import type { Feedback } from "@/lib/types"

export default function TrainerFeedbackPage() {
  const { appUser } = useAuth()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    async function load() {
      const courses = await listCoursesByTrainer(appUser!.uid)
      const lists = await Promise.all(courses.map((c) => listFeedbackForCourse(c.id)))
      if (mounted) {
        setFeedback(lists.flat().sort((a, b) => b.createdAt - a.createdAt))
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
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">What trainees are saying about your courses.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No feedback submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{f.courseTitle}</p>
                  <p className="text-sm text-muted-foreground">{f.comment || "No comment left."}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.userName} · {formatRelativeTime(f.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`size-3.5 ${i < f.rating ? "fill-accent" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
