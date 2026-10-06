import "server-only"
import { NextResponse } from "next/server"
import { handleRouteError, requireUser, HttpError } from "@/lib/server/session"
import { adminDb } from "@/lib/server/firebase-admin"
import type { Evidence, EvidenceStatus } from "@/lib/types"

function asEvidence(data: FirebaseFirestore.DocumentData): Evidence {
  return data as Evidence
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const url = new URL(req.url)
    const courseId = url.searchParams.get("courseId")
    const scope = url.searchParams.get("scope")
    const query = adminDb().collection("evidence")
    let snap: FirebaseFirestore.QuerySnapshot

    if (scope === "trainer") {
      if (user.role !== "trainer" && user.role !== "admin") throw new HttpError(403, "Not allowed for your role.")
      snap = await query.where("trainerId", "==", user.uid).get()
    } else {
      if (user.role !== "trainee") throw new HttpError(403, "Only trainees can request personal evidence.")
      let personal = query.where("userId", "==", user.uid)
      if (courseId) personal = personal.where("courseId", "==", courseId)
      snap = await personal.get()
    }

    const evidence = snap.docs
      .map((doc) => asEvidence(doc.data()))
      .sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json({ evidence })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req, { roles: ["trainer", "admin"] })
    const body = await req.json().catch(() => ({}))
    const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : ""
    const status = body?.status as EvidenceStatus
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote : ""
    if (!evidenceId || !["pending", "needs-revision", "verified"].includes(status)) {
      return NextResponse.json({ error: "Invalid evidence review." }, { status: 400 })
    }

    const ref = adminDb().collection("evidence").doc(evidenceId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: "Evidence not found." }, { status: 404 })
    const evidence = snap.data() as Evidence
    if (user.role === "trainer" && evidence.trainerId !== user.uid) {
      throw new HttpError(403, "You do not own this evidence review.")
    }

    await ref.update({ status, reviewNote, reviewedAt: Date.now() })
    return NextResponse.json({ evidence: { ...evidence, status, reviewNote, reviewedAt: Date.now() } })
  } catch (err) {
    return handleRouteError(err)
  }
}
