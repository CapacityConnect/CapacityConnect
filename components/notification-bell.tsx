"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { listNotificationsForUser, markNotificationRead } from "@/lib/firebase/notifications"
import type { AppNotification } from "@/lib/types"
import { formatRelativeTime } from "@/lib/format"

export function NotificationBell() {
  const { appUser } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    listNotificationsForUser(appUser.uid).then((data) => {
      if (mounted) {
        setNotifications(data)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [appUser])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleOpen(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id)
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && <CheckCheck className="size-4 text-muted-foreground" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className="flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-muted"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[11px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
              </button>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
