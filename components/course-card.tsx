import Link from "next/link"
import { BookOpen, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Course } from "@/lib/types"

const DIFFICULTY_VARIANT: Record<Course["difficulty"], string> = {
  Beginner: "bg-success/15 text-success border-success/30",
  Intermediate: "bg-accent/15 text-accent border-accent/30",
  Advanced: "bg-destructive/15 text-destructive border-destructive/30",
}

export function CourseCard({
  course,
  href,
  progress,
}: {
  course: Course
  href: string
  progress?: number
}) {
  return (
    <Card className="flex flex-col overflow-hidden transition-colors hover:border-primary/40">
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            {course.competency}
          </Badge>
          <Badge variant="outline" className={DIFFICULTY_VARIANT[course.difficulty]}>
            {course.difficulty}
          </Badge>
        </div>
        <Link href={href} className="text-base font-semibold leading-tight hover:underline">
          {course.title}
        </Link>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {course.durationHours}h
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" /> {course.modules.length} modules
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {course.enrollmentCount}
          </span>
        </div>
        {typeof progress === "number" && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <span className="text-xs text-muted-foreground">{progress}% complete</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground">
          By <span className="font-medium text-foreground">{course.trainerName}</span>
        </p>
      </CardFooter>
    </Card>
  )
}
