import type { AttemptLogEntry } from '../learner/attemptLog'
import { summarizeAll } from '../learner/mastery'
import { summarizeLatency } from '../metrics/latency'
import type { LatencySample, LatencySummary } from '../metrics/latency'

/**
 * Pilot data export.
 *
 * Attempts live in the participant's own browser (IndexedDB) and never leave it
 * unless they choose to export — which keeps the "no data leaves your device"
 * property that makes ethics approval straightforward. For a supervised pilot
 * that is enough: the participant exports at the end of the session and hands
 * the file over.
 *
 * A participant code, not a name: the export should not carry personal data.
 */
export interface PilotExport {
  participantCode: string
  exportedAt: string
  totals: {
    attempts: number
    distinctSigns: number
    /**
     * Distinct practice sessions. The proposal's learning-gain target is
     * "after 10 sessions", so this is the denominator that claim needs.
     * Free practice and scenario turns carry no session id and are excluded.
     */
    sessions: number
    meanScore: number | null
    firstAttemptAt: string | null
    lastAttemptAt: string | null
  }
  perSign: Array<{
    gloss: string
    attempts: number
    mastery: number
    firstScore: number | null
    lastScore: number | null
  }>
  attempts: AttemptLogEntry[]
  /**
   * Feedback latency measured on this participant's own hardware — which is
   * the point: the ≤300 ms target is a claim about real machines, and a pilot
   * is the only place a spread of them gets tested. Null summary means the
   * session produced no samples.
   */
  latency: {
    summary: LatencySummary | null
    samples: LatencySample[]
  }
}

export function buildExport(
  participantCode: string,
  attempts: AttemptLogEntry[],
  latency: LatencySample[] = [],
  now: Date = new Date(),
): PilotExport {
  const ordered = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const glosses = [...new Set(ordered.map((a) => a.gloss))]

  const perSign = summarizeAll(glosses, ordered).map((s) => {
    const own = ordered.filter((a) => a.gloss === s.gloss)
    return {
      gloss: s.gloss,
      attempts: s.attempts,
      mastery: Number(s.mastery.toFixed(4)),
      // First and last score per sign is what a learning-gain measure needs.
      firstScore: own[0]?.score ?? null,
      lastScore: own[own.length - 1]?.score ?? null,
    }
  })

  return {
    participantCode: participantCode.trim() || 'anonymous',
    exportedAt: now.toISOString(),
    totals: {
      attempts: ordered.length,
      distinctSigns: glosses.length,
      sessions: new Set(ordered.map((a) => a.sessionId).filter(Boolean)).size,
      meanScore:
        ordered.length > 0
          ? Math.round(ordered.reduce((t, a) => t + a.score, 0) / ordered.length)
          : null,
      firstAttemptAt: ordered[0]?.createdAt ?? null,
      lastAttemptAt: ordered[ordered.length - 1]?.createdAt ?? null,
    },
    perSign,
    attempts: ordered,
    latency: {
      summary: summarizeLatency(latency),
      samples: [...latency].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    },
  }
}

function csvCell(value: string | number | null): string {
  const s = value === null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * One row per attempt — the shape a stats tool or spreadsheet wants.
 *
 * Latency columns are joined on the attempt id and left blank where no sample
 * was taken (a take with no frames, or the tab in the background). Blank means
 * *not measured*; it must not be read as zero.
 */
export function toCsv(data: PilotExport): string {
  const header = [
    'participant_code',
    'attempt_index',
    'gloss',
    'score',
    'worst_fingers',
    'reference_id',
    'session_id',
    'created_at',
    'latency_total_ms',
    'latency_tracking_ms',
    'latency_scoring_ms',
    'latency_render_ms',
  ]
  const byId = new Map(data.latency.samples.map((s) => [s.id, s]))
  const rows = data.attempts.map((a, i) => {
    const l = byId.get(a.id)
    return [
      data.participantCode,
      i + 1,
      a.gloss,
      a.score,
      a.worstFingers.join(' '),
      a.referenceId,
      // Blank for free practice and scenario turns — see AttemptLogEntry.
      a.sessionId ?? null,
      a.createdAt,
      l?.totalMs ?? null,
      l?.trackingMs ?? null,
      l?.scoringMs ?? null,
      l?.renderMs ?? null,
    ]
      .map(csvCell)
      .join(',')
  })
  return [header.join(','), ...rows].join('\n') + '\n'
}

export function downloadFile(filename: string, contents: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download before it starts reading.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
