import "server-only"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { computeCompetencyUpdate } from "@/lib/competency-math"
import { handleRouteError, HttpError, requireUser } from "@/lib/server/session"
import type { CompetencyRecord } from "@/lib/types"

const SUPPORTED = new Set(["Data Analysis", "Communication", "Digital Skills", "Problem Solving", "Leadership"])
const CONFIDENCE_SCORES = [0, 40, 75, 100]

export async function POST(req: Request) {
  try {
    const user = await requireUser(req, { roles: ["trainee"] })
    const body = await req.json().catch(() => ({}))
    const competency = typeof body?.competency === "string" ? body.competency : ""
    const answers = Array.isArray(body?.answers) ? body.answers : []
    if (!SUPPORTED.has(competency)) throw new HttpError(400, "Unsupported competency.")
    if (answers.length !== 5 || answers.some((answer: unknown) => !Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3)) {
      throw new HttpError(400, "Answer count is invalid.")
    }
    const score = Math.round(answers.reduce((sum: number, answer: number) => sum + CONFIDENCE_SCORES[answer], 0) / answers.length)
    const db = adminDb()
    const ref = db.collection("competencies").doc(user.uid)
    const snap = await ref.get()
    const record = snap.exists ? (snap.data() as CompetencyRecord) : null
    const current = record?.scores?.[competency] ?? { current: 40, target: 75, updatedAt: Date.now() }
    const result = computeCompetencyUpdate(current.current, current.target, score)
    const now = Date.now()
    await ref.set(
      {
        userId: user.uid,
        updatedAt: now,
        [`scores.${competency}`]: { current: result.newScore, target: current.target, updatedAt: now },
      },
      { merge: true },
    )
    return NextResponse.json({ competency, diagnosticScore: score, before: current.current, after: result.newScore, improvement: result.improvement, target: current.target })
  } catch (err) {
    return handleRouteError(err)
  }
}
