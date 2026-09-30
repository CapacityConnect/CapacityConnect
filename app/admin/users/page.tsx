"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { listUsers, setUserRole } from "@/lib/firebase/users"
import type { AppUser, Role } from "@/lib/types"

const roles: Role[] = ["trainee", "trainer", "admin"]

export default function AdminUsersPage() {
  const { appUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    listUsers().then((data) => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [users, search],
  )

  async function handleRoleChange(u: AppUser, role: Role) {
    if (u.uid === appUser?.uid) {
      toast.error("You cannot change your own role.")
      return
    }
    await setUserRole(u.uid, role)
    setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, role, status: "approved" } : x)))
    toast.success(`${u.name} is now ${role}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">All users</h1>
        <p className="text-sm text-muted-foreground">Manage roles across the platform.</p>
      </div>

      <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.status === "approved"
                          ? "border-success/30 bg-success/15 text-success"
                          : u.status === "pending"
                            ? "border-accent/30 bg-accent/15 text-accent"
                            : "border-destructive/30 bg-destructive/15 text-destructive"
                      }
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u, v as Role)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
