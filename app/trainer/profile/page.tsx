"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { updateUserProfile } from "@/lib/firebase/users"
import { PushNotificationToggle } from "@/components/push-notification-toggle"

export default function TrainerProfilePage() {
  const { appUser, refreshAppUser } = useAuth()
  const [name, setName] = useState(appUser?.name ?? "")
  const [designation, setDesignation] = useState(appUser?.designation ?? "")
  const [qualifications, setQualifications] = useState(appUser?.qualifications ?? "")
  const [expertise, setExpertise] = useState(appUser?.expertise?.join(", ") ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!appUser) return
    setSaving(true)
    await updateUserProfile(appUser.uid, {
      name,
      designation,
      qualifications,
      expertise: expertise.split(",").map((s) => s.trim()).filter(Boolean),
    })
    await refreshAppUser()
    setSaving(false)
    toast.success("Profile updated")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile & settings</h1>
        <p className="text-sm text-muted-foreground">Manage your trainer profile.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Trainer information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={appUser?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expertise">Areas of expertise (comma separated)</Label>
            <Input id="expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Textarea id="qualifications" value={qualifications} onChange={(e) => setQualifications(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            Save changes
          </Button>
        </CardContent>
      </Card>

      <div className="max-w-lg">
        <PushNotificationToggle />
      </div>
    </div>
  )
}
