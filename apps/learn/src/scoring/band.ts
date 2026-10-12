/**
 * The band a 0–100 sign-match score falls into. Shared by the score ring and
 * the scenario summary, so a row of 20s reads as "Keep practising" rather than
 * as five anonymous stubs.
 */
export function band(score: number): { klass: string; label: string } {
  if (score >= 85) return { klass: 'good', label: 'Great match' }
  if (score >= 60) return { klass: 'ok', label: 'Getting there' }
  return { klass: 'low', label: 'Keep practising' }
}
