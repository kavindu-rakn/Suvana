import { describe, expect, it } from 'vitest'
import type { AttemptLogEntry, AttemptStage } from './attemptLog'
import type { CurriculumUnit } from '../data/curriculum'
import { starsFor } from './game'
import { isDueReview, practiceNeed, summarizeAll } from './mastery'
import { nextExercise } from './nextExercise'
import type { ExerciseRecommendation } from './nextExercise'
import { startUnitSession } from './session'

// T-04: the learner-model worked example reproduced in the final thesis
// (section 4, adaptation). One sign goes through 4 scripted attempts; after
// each, the real mastery/game/nextExercise/session code reports what Learn
// would do next. The scores are scripted inputs, not measured attempts, and
// SIGN-A/B/C are placeholders, not SSL glosses. If these tables change, the
// thesis tables must change with them.

const UNIT: CurriculumUnit = {
  id: 'worked-example', title: 'Worked example', description: 'Placeholder unit',
  status: 'approved', signs: ['SIGN-A', 'SIGN-B', 'SIGN-C'],
}
const DAY_0 = Date.parse('2026-10-17T10:00:00.000Z')
const MINUTE = 60_000
const DAY = 86_400_000

interface Step { label: string; minutes: number; stage?: AttemptStage; score?: number; revealed?: boolean }

// Three Try attempts and an unrevealed Recall in one sitting, then a check
// five days later with no new attempt (staleness only). At the check the sign
// is due because of the five-day gap, but the reason rule tests "latest score
// below the previous one" first, and Recall 66 < Try 76, so the literal reason
// is "review: score dropped" (ADAPTATION.md: reasons are literal rules).
const SCRIPT: Step[] = [
  { label: '1', minutes: 0, stage: 'try', score: 30 },
  { label: '2', minutes: 2, stage: 'try', score: 50 },
  { label: '3', minutes: 4, stage: 'try', score: 76 },
  { label: '4', minutes: 6, stage: 'recall', score: 66, revealed: false },
  { label: 'check', minutes: 5 * 24 * 60 + 6 },
]

function when(minutes: number): string {
  const at = new Date(DAY_0 + minutes * MINUTE)
  const day = Math.floor(minutes * MINUTE / DAY)
  return `day ${day}, ${at.toISOString().slice(11, 16)}`
}

function stageLabel(step: Step): string {
  if (step.stage === undefined) return 'none (check only)'
  if (step.stage === 'recall') return step.revealed === false ? 'Recall (not revealed)' : 'Recall (revealed)'
  return 'Try'
}

function exerciseLabel(exercise: ExerciseRecommendation): string {
  if (exercise.stage === 'recall') return `Recall (${exercise.reason})`
  return `Try ${exercise.suggestedSpeed}x${exercise.offerGhost ? ' + ghost' : ''} (${exercise.reason})`
}

const STATE_HEADER = [
  '| Step | Time (UTC) | Stage | Match | EWMA mastery | Level | Need | Due | Stars |',
  '|---|---|---|---|---|---|---|---|---|',
]
const NEXT_HEADER = [
  '| Step | Next exercise for SIGN-A (nextExercise) | Path session order (startUnitSession) | Reason for the first item |',
  '|---|---|---|---|',
]

function runWorkedExample(): { state: string; next: string } {
  const entries: AttemptLogEntry[] = []
  const state = [...STATE_HEADER]
  const next = [...NEXT_HEADER]
  for (const step of SCRIPT) {
    const at = new Date(DAY_0 + step.minutes * MINUTE)
    if (step.stage !== undefined && step.score !== undefined) {
      entries.push({
        id: `worked-${step.label}`, gloss: 'SIGN-A', referenceId: 'placeholder-reference',
        score: step.score, stage: step.stage, worstFingers: [], createdAt: at.toISOString(),
        ...(step.revealed === undefined ? {} : { revealed: step.revealed }),
      })
    }
    // PathView builds the summaries the same way, over every loaded gloss.
    const summaries = summarizeAll(UNIT.signs, entries)
    const signA = summaries.find((summary) => summary.gloss === 'SIGN-A')!
    const session = startUnitSession(UNIT, summaries, at)
    state.push(`| ${step.label} | ${when(step.minutes)} | ${stageLabel(step)} | ${step.score ?? '-'} | ${
      signA.mastery.toFixed(3)} | ${signA.level} | ${practiceNeed(signA, at).toFixed(3)} | ${
      isDueReview(signA, at) ? 'yes' : 'no'} | ${starsFor('SIGN-A', entries)} |`)
    next.push(`| ${step.label} | ${exerciseLabel(nextExercise('SIGN-A', entries))} | ${
      session.glosses.join(', ')} | ${session.recommendations![0].reason} |`)
  }
  return { state: state.join('\n'), next: next.join('\n') }
}

describe('learner-model worked example (T-04, thesis section 4)', () => {
  it('prints EWMA, need, stars and the chosen next item with its reason', () => {
    const { state, next } = runWorkedExample()
    console.log(`\nT-04 worked example (apps/learn/src/learner/workedExample.test.ts)\n\n${state}\n\n${next}\n`)
    expect(state).toBe([
      ...STATE_HEADER,
      '| 1 | day 0, 10:00 | Try | 30 | 0.300 | learning | 0.525 | yes | 0 |',
      '| 2 | day 0, 10:02 | Try | 50 | 0.400 | learning | 0.450 | no | 0 |',
      '| 3 | day 0, 10:04 | Try | 76 | 0.580 | learning | 0.315 | no | 2 |',
      '| 4 | day 0, 10:06 | Recall (not revealed) | 66 | 0.620 | improving | 0.285 | no | 3 |',
      '| check | day 5, 10:06 | none (check only) | - | 0.620 | improving | 0.535 | yes | 3 |',
    ].join('\n'))
    expect(next).toBe([
      ...NEXT_HEADER,
      '| 1 | Try 0.5x (try: build reference match) | SIGN-A, SIGN-B, SIGN-C | review: low match score |',
      '| 2 | Try 0.25x + ghost (retry: last two tries below 60) | SIGN-B, SIGN-C, SIGN-A | new: next in unit |',
      '| 3 | Recall (recall: Try match reached 70) | SIGN-B, SIGN-C, SIGN-A | new: next in unit |',
      '| 4 | Recall (recall: keep practising from memory) | SIGN-B, SIGN-C, SIGN-A | new: next in unit |',
      '| check | Recall (recall: keep practising from memory) | SIGN-A, SIGN-B, SIGN-C | review: score dropped |',
    ].join('\n'))
  })
})
