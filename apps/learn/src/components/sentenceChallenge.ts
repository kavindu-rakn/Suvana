import { SENTENCES } from '../data/sentences'
import { scoreAttempt } from '../scoring/score'
import { trimTake } from '../scoring/trimTake'
import type { CapturedTake } from '../vision/useSignCapture'
import type { RecordingMeta, SignRecording } from '../vision/types'

/** Join by the real recording ID and file; never turn a gloss into a label. */
export function availableSentences(index: readonly RecordingMeta[]) {
  return SENTENCES.filter(sentence => index.some(rec => rec.id === sentence.refId && rec.file === sentence.file))
}

export function sentenceCaptureMs(reference: Pick<SignRecording, 'durationMs'>): number {
  return Number.isFinite(reference.durationMs) && reference.durationMs > 0 ? reference.durationMs * 2 : 0
}

/** One complete reference, existing DTW only. No isolated-sign reward bands or
 * corrective finger feedback are inferred for these uncalibrated sentences. */
export function scoreSentenceTake(take: CapturedTake, reference: SignRecording) {
  const frames = trimTake(take.frames)
  if (frames.length < 2) return null
  const durationMs = frames[frames.length - 1].timestampMs
  if (durationMs <= 0) return null
  const attempt: SignRecording = {
    id: crypto.randomUUID(), gloss: reference.gloss, signer: 'learner',
    sourceCategory: 'SSL Sentences', createdAt: new Date().toISOString(),
    frames, durationMs, fps: (frames.length - 1) * 1000 / durationMs,
    videoWidth: take.videoWidth, videoHeight: take.videoHeight,
  }
  const match = scoreAttempt(attempt, reference)
  if (!Number.isFinite(match.score) || match.hands.length === 0 || match.hands.every(hand => hand.missing)) return null
  return { attempt, match }
}
