"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Role } from "@/lib/types"
import { DashboardShell } from "@/components/dashboard-shell"
import { Skeleton } from "@/components/ui/skeleton"

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { loading, firebaseUser, appUser, logout } = useAuth()
  const router = useRouter()
  const suspensionHandled = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!firebaseUser || !appUser) {
      router.replace("/login")
      return
    }
    if (appUser.status === "suspended" && !suspensionHandled.current) {
      suspensionHandled.current = true
      void logout().finally(() => router.replace("/login"))
      return
    }
    if (appUser.status === "pending") {
      router.replace("/pending-approval")
      return
    }
    if (appUser.role !== role) {
      router.replace(`/${appUser.role}`)
    }
  }, [loading, firebaseUser, appUser, role, router, logout])

  if (loading || !appUser || appUser.role !== role || appUser.status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex w-full max-w-sm flex-col gap-3 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return <DashboardShell role={role}>{children}</DashboardShell>
}
