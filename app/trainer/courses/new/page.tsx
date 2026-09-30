"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { createCourse } from "@/lib/firebase/courses"
import { COMPETENCIES } from "@/lib/types"

interface ModuleDraft {
  title: string
  summary: string
}

export default function NewCoursePage() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [competency, setCompetency] = useState<string>(COMPETENCIES[0])
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner")
  const [durationHours, setDurationHours] = useState(4)
  const [modules, setModules] = useState<ModuleDraft[]>([{ title: "", summary: "" }])
  const [saving, setSaving] = useState(false)

  function updateModule(index: number, field: keyof ModuleDraft, value: string) {
    setModules((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  function addModule() {
    setModules((prev) => [...prev, { title: "", summary: "" }])
  }

  function removeModule(index: number) {
    setModules((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!appUser) return
    if (!title.trim() || !description.trim() || modules.some((m) => !m.title.trim())) {
      toast.error("Fill in the course title, description, and every module title.")
      return
    }
    setSaving(true)
    const course = await createCourse({
      title,
      description,
      competency,
      difficulty,
      durationHours,
      trainerId: appUser.uid,
      trainerName: appUser.name,
      modules: modules.map((m, i) => ({ title: m.title, summary: m.summary, order: i + 1 })),
    })
    setSaving(false)
    toast.success("Course created")
    router.push(`/trainer/courses/${course.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Create a course</h1>
        <p className="text-sm text-muted-foreground">Set up the course details and modules.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Course details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Analysis Basics" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will trainees learn?"
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Competency</Label>
                <Select value={competency} onValueChange={(value) => value && setCompetency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((m, i) => (
              <div key={i} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Module {i + 1}</Label>
                  {modules.length > 1 && (
                    <button onClick={() => removeModule(i)} aria-label="Remove module">
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Module title"
                  value={m.title}
                  onChange={(e) => updateModule(i, "title", e.target.value)}
                />
                <Textarea
                  placeholder="Short summary"
                  value={m.summary}
                  onChange={(e) => updateModule(i, "summary", e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={addModule}>
              <Plus className="size-4" /> Add module
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button className="w-fit" disabled={saving} onClick={handleSubmit}>
        Create course
      </Button>
    </div>
  )
}
