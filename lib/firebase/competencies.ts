import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { CompetencyRecord } from "@/lib/types"
import { COMPETENCIES } from "@/lib/types"

export { computeCompetencyUpdate } from "@/lib/competency-math"
import { computeCompetencyUpdate } from "@/lib/competency-math"

export async function getCompetencyRecord(uid: string): Promise<CompetencyRecord | null> {
  const snap = await getDoc(doc(db, "competencies", uid))
  return snap.exists() ? (snap.data() as CompetencyRecord) : null
}

export async function listAllCompetencyRecords(): Promise<CompetencyRecord[]> {
  const snap = await getDocs(collection(db, "competencies"))
  return snap.docs.map((d) => d.data() as CompetencyRecord)
}

export async function applyCompetencyUpdate(
  uid: string,
  competency: string,
  assessmentScorePercent: number,
): Promise<{ before: number; after: number; improvement: number; target: number }> {
  const existing = await getCompetencyRecord(uid)
  const scores = existing?.scores ?? {}
  const currentEntry = scores[competency] ?? { current: 40, target: 75, updatedAt: Date.now() }
  const { newScore, improvement } = computeCompetencyUpdate(currentEntry.current, currentEntry.target, assessmentScorePercent)

  const updatedScores = {
    ...scores,
    [competency]: { current: newScore, target: currentEntry.target, updatedAt: Date.now() },
  }

  await setDoc(doc(db, "competencies", uid), { userId: uid, scores: updatedScores, updatedAt: Date.now() } satisfies CompetencyRecord)

  return { before: currentEntry.current, after: newScore, improvement, target: currentEntry.target }
}

export async function ensureCompetencyRecord(uid: string) {
  const existing = await getCompetencyRecord(uid)
  if (existing) return existing
  const scores: CompetencyRecord["scores"] = {}
  for (const name of COMPETENCIES) {
    scores[name] = { current: 55, target: 80, updatedAt: Date.now() }
  }
  const record: CompetencyRecord = { userId: uid, scores, updatedAt: Date.now() }
  await setDoc(doc(db, "competencies", uid), record)
  return record
}

export function getPriorityGap(record: CompetencyRecord | null) {
  if (!record) return null
  let best: { competency: string; current: number; target: number; gap: number } | null = null
  for (const [competency, score] of Object.entries(record.scores)) {
    const gap = score.target - score.current
    if (gap > 0 && (!best || gap > best.gap)) {
      best = { competency, current: score.current, target: score.target, gap }
    }
  }
  return best
}

/** All competencies where the learner is below target, sorted largest gap first. */
export function getAllGaps(record: CompetencyRecord | null) {
  if (!record) return []
  const gaps: { competency: string; current: number; target: number; gap: number }[] = []
  for (const [competency, score] of Object.entries(record.scores)) {
    const gap = score.target - score.current
    if (gap > 0) gaps.push({ competency, current: score.current, target: score.target, gap })
  }
  return gaps.sort((a, b) => b.gap - a.gap)
}
