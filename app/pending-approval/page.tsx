"use client"

import { useRouter } from "next/navigation"
import { Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

export default function PendingApprovalPage() {
  const { logout, appUser } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-warning/20 text-warning">
            <Clock3 className="size-6" />
          </div>
          <CardTitle>Your trainer account is pending approval</CardTitle>
          <CardDescription>
            Thanks for signing up, {appUser?.name ?? "there"}. An administrator needs to review and approve trainer
            accounts before you can access the platform. You&apos;ll be notified once you&apos;re approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
