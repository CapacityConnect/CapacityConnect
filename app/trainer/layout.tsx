"use client"

import type { ReactNode } from "react"
import { RequireRole } from "@/components/require-role"

export default function TrainerLayout({ children }: { children: ReactNode }) {
  return <RequireRole role="trainer">{children}</RequireRole>
}
