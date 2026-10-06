import "server-only"
import { NextResponse } from "next/server"
import { requireUser, handleRouteError } from "@/lib/server/session"
import { seedDemoData } from "@/lib/server/demo-seed"

export async function POST(req: Request) {
  try {
    const user = await requireUser(req, { roles: ["admin"] })
    const result = await seedDemoData(user.uid)
    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
