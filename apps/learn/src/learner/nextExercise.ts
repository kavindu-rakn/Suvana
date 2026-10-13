import type { AttemptLogEntry } from './attemptLog'
import { isScoredAttempt, RECALL_THIRD_STAR, starsFor, TRY_FIRST_STAR, TRY_SECOND_STAR } from './game'

export type ExerciseRecommendation =
  | { stage: 'try'; recallUnlocked: boolean; suggestedSpeed: 0.25 | 0.5; offerGhost: boolean; reason: string }
  | { stage: 'recall'; recallUnlocked: true; reason: string }

/** Pure teaching recommendation for a named sign. Match scores, not judgments
 * of correctness. Suggestions do not force controls or award any stars. */
export function nextExercise(gloss: string, attempts: readonly AttemptLogEntry[]): ExerciseRecommendation {
  const own = attempts.filter((entry) => entry.gloss === gloss && isScoredAttempt(entry) && entry.stage !== 'sentence')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const latest = own[own.length - 1]
  const previous = own[own.length - 2]
  const recallUnlocked = starsFor(gloss, own) >= 2
  const tryStage = (entry: AttemptLogEntry) => entry.stage === undefined || entry.stage === 'try'

  if (latest?.stage === 'recall' && latest.score < RECALL_THIRD_STAR) {
    return { stage: 'try', recallUnlocked, suggestedSpeed: 0.5, offerGhost: false, reason: 'retry: recall below 60' }
  }
  if (latest && previous && tryStage(latest) && tryStage(previous)
      && latest.score < TRY_FIRST_STAR && previous.score < TRY_FIRST_STAR) {
    return { stage: 'try', recallUnlocked, suggestedSpeed: 0.25, offerGhost: true, reason: 'retry: last two tries below 60' }
  }
  if (latest && tryStage(latest) && latest.score >= TRY_SECOND_STAR) {
    return { stage: 'recall', recallUnlocked: true, reason: 'recall: Try match reached 70' }
  }
  if (latest?.stage === 'recall' && recallUnlocked) {
    return { stage: 'recall', recallUnlocked: true, reason: latest.revealed === false
      ? 'recall: keep practising from memory' : 'recall: retry without revealing' }
  }
  return { stage: 'try', recallUnlocked, suggestedSpeed: 0.5, offerGhost: false, reason: 'try: build reference match' }
}
