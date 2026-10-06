"use client"

import { useCallback, useEffect, useState } from "react"
import { Megaphone } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { auth } from "@/lib/firebase/config"
import { listAnnouncements } from "@/lib/firebase/announcements"
import { formatRelativeTime } from "@/lib/format"
import type { Announcement } from "@/lib/types"
import { LiveDataError } from "@/components/live-data-state"

export default function AdminAnnouncementsPage() {
  const { appUser } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState<Announcement["audience"]>("all")
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setAnnouncements(await listAnnouncements()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load live announcements.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function handlePost() {
    if (!appUser || !title.trim() || !message.trim()) {
      toast.error("Add a title and message.")
      return
    }
    setPosting(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, message, audience }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed to post announcement." }))
        throw new Error(error)
      }
      const { announcement } = (await res.json()) as { announcement: Announcement }
      setAnnouncements((prev) => [announcement, ...prev])
      setTitle("")
      setMessage("")
      toast.success("Announcement posted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post announcement.")
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Broadcast updates to trainees and trainers.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">New announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          <div className="flex items-center gap-3">
            <Select value={audience} onValueChange={(v) => setAudience(v as Announcement["audience"])}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="trainee">Trainees only</SelectItem>
                <SelectItem value="trainer">Trainers only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePost} disabled={posting}>
              Post announcement
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <LiveDataError message={error} onRetry={() => void load()} />
      ) : announcements.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <Megaphone className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {a.audience === "all" ? "everyone" : a.audience}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
