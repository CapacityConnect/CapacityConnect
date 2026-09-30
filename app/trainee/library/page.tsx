"use client"

import { useEffect, useState } from "react"
import { FileText, Presentation, Video } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatFileSize, formatRelativeTime } from "@/lib/format"
import { listLibraryResources } from "@/lib/firebase/resources"
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

export default function TraineeLibraryPage() {
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    listLibraryResources().then((list) => {
      setResources(list)
      setLoading(false)
    })
  }, [])

  const filtered = resources.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <DashboardShell role="trainee">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Trainer Library</h1>
          <p className="text-sm text-muted-foreground">
            Recorded lectures, presentations, and study materials shared by trainers.
          </p>
        </div>

        <Input
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No materials found.
              </CardContent>
            </Card>
          ) : (
            filtered.map((r) => {
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
                          By {r.uploadedByName} · {formatFileSize(r.fileSize)} · {formatRelativeTime(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary">{CATEGORY_LABEL[r.category]}</Badge>
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary underline">
                        Open
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
