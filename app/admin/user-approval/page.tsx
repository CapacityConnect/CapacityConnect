"use client"

import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { listPendingUsers } from "@/lib/firebase/users"
import { auth } from "@/lib/firebase/config"
import { formatDate } from "@/lib/format"
import type { AppUser } from "@/lib/types"

export default function UserApprovalPage() {
  const [pending, setPending] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPendingUsers().then((data) => {
      setPending(data)
      setLoading(false)
    })
  }, [])

  async function handleDecision(u: AppUser, approve: boolean) {
    const token = await auth.currentUser?.getIdToken()
    const res = await fetch(`/api/users/${u.uid}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision: approve ? "approved" : "rejected" }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Something went wrong." }))
      toast.error(error)
      return
    }
    setPending((prev) => prev.filter((x) => x.uid !== u.uid))
    toast.success(approve ? `${u.name} approved` : `${u.name} rejected`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">User approvals</h1>
        <p className="text-sm text-muted-foreground">Review and approve new trainee and trainer sign-ups.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No pending approvals.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <Card key={u.uid}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{u.name}</p>
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.organization && `${u.organization} · `}
                    {u.designation && `${u.designation} · `}
                    Applied {formatDate(u.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDecision(u, false)}>
                    <X className="size-4" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => handleDecision(u, true)}>
                    <Check className="size-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
