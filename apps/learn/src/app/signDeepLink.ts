import { isSentenceGloss, isSentenceReference } from '../data/sentences'
import type { RecordingMeta } from '../vision/types'

/** The caller supplies the edition-filtered bundled index, never local recordings. */
export function matchSignDeepLink(search: string, index: readonly RecordingMeta[]): string | null {
  // URLSearchParams decodes spaces once. Do not trim, fold case or map glosses.
  const gloss = new URLSearchParams(search).get('sign')
  if (!gloss || isSentenceGloss(gloss)) return null
  return index.some(rec => rec.gloss === gloss && !isSentenceReference(rec)) ? gloss : null
}
