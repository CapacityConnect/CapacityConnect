"use client"

import type { ReactNode } from "react"
import { RequireRole } from "@/components/require-role"

export default function TraineeLayout({ children }: { children: ReactNode }) {
  return <RequireRole role="trainee">{children}</RequireRole>
}
