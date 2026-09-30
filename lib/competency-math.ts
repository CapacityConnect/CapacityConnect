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
