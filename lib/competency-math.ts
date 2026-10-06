/**
 * Pure competency scoring math, kept free of any Firebase import so it can be
 * safely used from both client code (lib/firebase/competencies.ts) and
 * server-only route handlers without pulling the client Firebase SDK into
 * the server bundle.
 *
 * Deterministic, explainable competency update.
 * delta = round((assessmentScorePercent - currentScore) * 0.5)
 * i.e. the learner closes half the distance between their current
 * competency and their demonstrated assessment performance.
 * Example: current 42, assessment 80% -> delta = round((80-42)*0.5) = 19 -> new = 61.
 */
export function computeCompetencyUpdate(current: number, target: number, assessmentScorePercent: number) {
  const rawDelta = Math.round((assessmentScorePercent - current) * 0.5)
  const proposed = current + rawDelta
  const ceiling = Math.max(target, current)
  const bounded = Math.min(Math.max(proposed, 0), Math.max(ceiling, 100) === 100 ? 100 : ceiling)
  const newScore = Math.min(Math.max(proposed, 0), 100)
  const improvement = newScore - current
  return { newScore, improvement, rawDelta }
}

/**
 * Deterministic, explainable "readiness" score: how close a learner is to
 * being job-ready for the roles their competencies feed into. Blends how far
 * along their tracked competencies are (60%) with tangible proof of applied
 * skill — trainer-verified evidence (up to 20%) and earned certificates (up
 * to 20%) — so the score can't be gamed by quiz scores alone.
 */
export function computeReadinessScore(
  competencyAttainmentPercent: number,
  verifiedEvidenceCount: number,
  certificateCount: number,
) {
  const competencyPart = Math.max(0, Math.min(100, competencyAttainmentPercent)) * 0.6
  const evidencePart = Math.min(verifiedEvidenceCount * 10, 20)
  const certificatePart = Math.min(certificateCount * 10, 20)
  return Math.round(competencyPart + evidencePart + certificatePart)
}

/** Average of (current/target)*100 across tracked competencies, capped at 100 per skill. */
export function averageCompetencyAttainment(scores: Record<string, { current: number; target: number }>) {
  const entries = Object.values(scores)
  if (entries.length === 0) return 0
  const total = entries.reduce((sum, s) => sum + Math.min(100, (s.current / Math.max(s.target, 1)) * 100), 0)
  return Math.round(total / entries.length)
}
