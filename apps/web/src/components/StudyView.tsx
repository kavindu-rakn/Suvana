import { useEffect, useState } from 'react'
import { listAttempts } from '../learner/attemptLog'
import { listSamples } from '../metrics/latencyStore'
import type { LatencySample } from '../metrics/latency'
import { buildExport, downloadFile, toCsv } from '../pilot/exportResults'
import { LatencyPanel } from './LatencyPanel'

const PARTICIPANT_KEY = 'ssl-learn-participant'

/**
 * Pilot-study tooling: participant code, results export, and the feedback
 * latency the proposal's ≤300 ms target is measured against.
 *
 * These used to sit on the Progress tab, where a participant met them while
 * looking at their own learning. They belong to the researcher running the
 * session, so they live in author mode — see app/mode.ts.
 */
export function StudyView() {
  const [attemptCount, setAttemptCount] = useState(0)
  const [latency, setLatency] = useState<LatencySample[]>([])
  const [loading, setLoading] = useState(true)
  const [participantCode, setParticipantCode] = useState(
    () => localStorage.getItem(PARTICIPANT_KEY) ?? '',
  )

  useEffect(() => {
    void (async () => {
      const [log, samples] = await Promise.all([listAttempts(), listSamples()])
      setAttemptCount(log.length)
      setLatency(samples)
      setLoading(false)
    })()
  }, [])

  async function exportResults(format: 'json' | 'csv') {
    // Re-read rather than exporting the state loaded on mount, so attempts made
    // since this tab was opened are in the file the participant hands over.
    const [attempts, samples] = await Promise.all([listAttempts(), listSamples()])
    const data = buildExport(participantCode, attempts, samples)
    const stamp = data.exportedAt.slice(0, 10)
    const base = `ssl-learn_${data.participantCode}_${stamp}`.replace(/[^\w.-]+/g, '_')
    if (format === 'csv') {
      downloadFile(`${base}.csv`, toCsv(data), 'text/csv')
    } else {
      downloadFile(`${base}.json`, JSON.stringify(data, null, 2), 'application/json')
    }
  }

  return (
    <section className="library-card">
      <div className="library-head">
        <h2>Study session</h2>
        <span className="library-count">pilot tooling — not part of the learner experience</span>
      </div>

      <div className="pilot-export">
        <label className="field">
          Participant code (for the study — not their name)
          <input
            type="text"
            value={participantCode}
            onChange={(e) => {
              setParticipantCode(e.target.value)
              localStorage.setItem(PARTICIPANT_KEY, e.target.value)
            }}
            placeholder="e.g. P01"
          />
        </label>
        <div className="row-buttons">
          <button
            className="btn btn-ghost"
            onClick={() => void exportResults('json')}
            disabled={attemptCount === 0}
          >
            Export results (JSON)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => void exportResults('csv')}
            disabled={attemptCount === 0}
          >
            Export results (CSV)
          </button>
        </div>
        <p className="hint-text">
          {attemptCount === 0
            ? 'No attempts recorded in this browser yet — run a practice session first.'
            : `${attemptCount} attempt${attemptCount === 1 ? '' : 's'} in this browser. `}
          Attempts stay on this device until exported. The file contains scores and timings,
          never any video.
        </p>
      </div>

      {loading ? <p className="empty-state">Loading…</p> : <LatencyPanel samples={latency} />}
    </section>
  )
}
