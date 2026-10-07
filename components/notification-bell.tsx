"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { listNotificationsForUser, markNotificationRead } from "@/lib/firebase/notifications"
import type { AppNotification } from "@/lib/types"
import { formatRelativeTime } from "@/lib/format"

export function NotificationBell() {
  const { appUser } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!appUser) return
    setLoading(true)
    setError(null)
    try {
      setNotifications(await listNotificationsForUser(appUser.uid))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load live notifications.")
    } finally {
      setLoading(false)
    }
  }, [appUser])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleOpen(notification: AppNotification) {
    if (notification.read) return
    try {
      await markNotificationRead(notification.id)
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to mark this notification as read.")
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Notifications</span>
            {unreadCount > 0 && <CheckCheck className="size-4" />}
          </div>
          <div className="h-80 overflow-y-auto border-t border-border">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : error ? (
              <div className="space-y-2 p-4">
                <p className="text-sm font-medium text-destructive">Live notifications unavailable</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void load()} type="button">
                  Retry
                </Button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleOpen(notification)}
                  className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{notification.message}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
