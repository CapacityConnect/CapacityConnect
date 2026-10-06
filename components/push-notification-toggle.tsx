"use client"

import { useEffect, useState } from "react"
import { BellRing } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionState,
  isPushSupported,
} from "@/lib/firebase/messaging"

export function PushNotificationToggle() {
  const { appUser } = useAuth()
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    isPushSupported().then((ok) => {
      setSupported(ok)
      if (ok) setEnabled(getPushPermissionState() === "granted" && !!appUser?.fcmTokens?.length)
    })
  }, [appUser?.fcmTokens])

  async function handleChange(checked: boolean) {
    if (!appUser) return
    setBusy(true)
    if (checked) {
      const result = await enablePushNotifications(appUser.uid)
      if (result.ok) {
        setEnabled(true)
        toast.success("Push notifications enabled")
      } else {
        toast.error(result.reason ?? "Couldn't enable push notifications")
      }
    } else {
      await disablePushNotifications(appUser.uid)
      setEnabled(false)
      toast.success("Push notifications disabled")
    }
    setBusy(false)
  }

  if (!supported) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="size-4 text-accent" /> Push notifications
        </CardTitle>
        <CardDescription>Get browser alerts for approvals, deadlines, and new announcements.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="text-sm">
            <p className="font-medium">Enable on this device</p>
            <p className="text-xs text-muted-foreground">
              {getPushPermissionState() === "denied"
                ? "Notifications are blocked in your browser settings."
                : "You can turn this off anytime."}
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={busy || getPushPermissionState() === "denied"}
            onCheckedChange={handleChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
