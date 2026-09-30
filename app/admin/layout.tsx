"use client"

import type { ReactNode } from "react"
import { RequireRole } from "@/components/require-role"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireRole role="admin">{children}</RequireRole>
}
