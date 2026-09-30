"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { CourseCard } from "@/components/course-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { listCourses, listEnrollmentsForUser } from "@/lib/firebase/courses"
import type { Course, Enrollment } from "@/lib/types"
import { COMPETENCIES } from "@/lib/types"

export default function BrowseCoursesPage() {
  const { appUser } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [competency, setCompetency] = useState<string>("all")

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    Promise.all([listCourses(), listEnrollmentsForUser(appUser.uid)]).then(([c, e]) => {
      if (!mounted) return
      setCourses(c)
      setEnrollments(e)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [appUser])

  const enrollmentByCourse = useMemo(() => new Map(enrollments.map((e) => [e.courseId, e])), [enrollments])

  const filtered = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchesCompetency = competency === "all" || c.competency === competency
    return matchesSearch && matchesCompetency
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Browse courses</h1>
        <p className="text-sm text-muted-foreground">Find courses aligned to the skills you want to build.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={competency} onValueChange={(value) => setCompetency(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All competencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All competencies</SelectItem>
            {COMPETENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No courses match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              href={`/trainee/courses/${course.id}`}
              progress={enrollmentByCourse.get(course.id)?.progress}
            />
          ))}
        </div>
      )}
    </div>
  )
}
