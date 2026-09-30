"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, Landmark, Presentation, Upload, Video } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { formatFileSize, formatRelativeTime } from "@/lib/format"
import { listLibraryResources, uploadLibraryResource } from "@/lib/firebase/resources"
import type { LibraryResource, LibraryResourceCategory } from "@/lib/types"

const CATEGORY_LABEL: Record<LibraryResourceCategory, string> = {
  "recorded-lecture": "Recorded lecture",
  presentation: "Presentation",
  "study-material": "Study material",
}

const CATEGORY_ICON: Record<LibraryResourceCategory, typeof Video> = {
  "recorded-lecture": Video,
  presentation: Presentation,
  "study-material": FileText,
}

export default function TrainerLibraryPage() {
  const { appUser } = useAuth()
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<LibraryResourceCategory>("study-material")
  const [isInstitutional, setIsInstitutional] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const list = await listLibraryResources()
    setResources(list)
    setLoading(false)
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !title.trim() || !appUser) return
    setProgress(0)
    const created = await uploadLibraryResource(
      file,
      {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        uploadedBy: appUser.uid,
        uploadedByName: appUser.name,
        isInstitutionalKnowledge: isInstitutional,
      },
      (pct) => setProgress(pct),
    )
    setResources((prev) => [created, ...prev])
    setTitle("")
    setDescription("")
    setIsInstitutional(false)
    setProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <DashboardShell role="trainer">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Resource Library</h1>
          <p className="text-sm text-muted-foreground">
            Upload recorded lectures, presentations, and study materials for trainees to access anytime.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload new material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lib-title">Title</Label>
                <Input id="lib-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 3 recorded session" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as LibraryResourceCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorded-lecture">Recorded lecture</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="study-material">Study material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lib-desc">Description (optional)</Label>
              <Textarea id="lib-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lib-file">File</Label>
              <Input id="lib-file" ref={fileInputRef} type="file" />
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-3">
              <Checkbox
                id="lib-institutional"
                checked={isInstitutional}
                onCheckedChange={(checked) => setIsInstitutional(checked === true)}
              />
              <Label htmlFor="lib-institutional" className="flex flex-col gap-0.5 font-normal">
                <span className="flex items-center gap-1.5 font-medium">
                  <Landmark className="size-3.5" /> Mark as institutional knowledge
                </span>
                <span className="text-xs text-muted-foreground">
                  Flags this as a vetted, org-wide reference asset rather than a routine upload.
                </span>
              </Label>
            </div>
            {progress !== null && <Progress value={progress} />}
            <Button onClick={handleUpload} disabled={!title.trim() || progress !== null}>
              <Upload className="mr-2 size-4" />
              Upload to library
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Uploaded materials</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>
          ) : (
            resources.map((r) => {
              const Icon = CATEGORY_ICON[r.category]
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-start justify-between gap-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(r.fileSize)} · uploaded {formatRelativeTime(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1.5">
                        {r.isInstitutionalKnowledge && (
                          <Badge className="gap-1 bg-accent text-accent-foreground">
                            <Landmark className="size-3" /> Institutional
                          </Badge>
                        )}
                        <Badge variant="secondary">{CATEGORY_LABEL[r.category]}</Badge>
                      </div>
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary underline">
                        Download
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
