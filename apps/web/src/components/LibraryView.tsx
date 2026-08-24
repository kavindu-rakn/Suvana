import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { deleteRecording, listRecordings, saveRecording } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { SkeletonPlayer } from './SkeletonPlayer'
import { glossLabel, translationOf } from '../data/translations'

interface Row {
  meta: RecordingMeta
  bundled: boolean
}

/** Reference library: local (IndexedDB) + bundled recordings, replay, JSON export/import. */
export function LibraryView() {
  const [local, setLocal] = useState<SignRecording[]>([])
  const [bundled, setBundled] = useState<RecordingMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  // Frames for the one open player. Rows themselves are rendered from metadata,
  // so browsing the library downloads nothing.
  const [openRec, setOpenRec] = useState<SignRecording | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const [filter, setFilter] = useState('')
  const openIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshLocal = useCallback(async () => {
    setLocal(await listRecordings())
  }, [])

  useEffect(() => {
    void (async () => {
      const [loc, index] = await Promise.all([listRecordings(), loadReferenceIndex()])
      setLocal(loc)
      setBundled(index)
      setLoading(false)
    })()
  }, [])

  /** A row shows metadata; this fetches the frames behind it when one is needed. */
  const resolveFull = useCallback(
    async (meta: RecordingMeta): Promise<SignRecording | null> => {
      if (meta.file) return loadReferenceFrames(meta.file)
      return local.find((r) => r.id === meta.id) ?? null
    },
    [local],
  )

  function isRecording(value: unknown): value is SignRecording {
    const rec = value as SignRecording
    return !!rec && typeof rec.gloss === 'string' && Array.isArray(rec.frames)
  }

  async function handleImport(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      try {
        const parsed: unknown = JSON.parse(await file.text())
        // Accept a single recording or an array of them (an exported bundle).
        const recs = (Array.isArray(parsed) ? parsed : [parsed]).filter(isRecording)
        if (recs.length === 0) throw new Error('not a recording')
        for (const rec of recs) {
          rec.id ||= crypto.randomUUID()
          await saveRecording(rec)
        }
      } catch {
        window.alert(`"${file.name}" doesn't look like a sign recording JSON.`)
      }
    }
    await refreshLocal()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function download(filename: string, contents: string) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoking synchronously can cancel the download in some browsers — give it
    // a moment to start reading the blob first.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  function fileNameFor(rec: { gloss: string; signer: string }, taken: Set<string>): string {
    const base = `${rec.gloss}_${rec.signer}`.replace(/[^\w-]+/g, '_')
    let name = `${base}.json`
    let n = 2
    while (taken.has(name)) name = `${base}_${n++}.json`
    taken.add(name)
    return name
  }

  async function exportRecording(meta: RecordingMeta) {
    const full = await resolveFull(meta)
    if (!full) {
      window.alert(`Could not load the frames for ${meta.gloss}, so it cannot be exported.`)
      return
    }
    download(fileNameFor(full, new Set()), JSON.stringify(full))
  }

  /**
   * Export every local recording as its own file, plus the manifest.json that
   * lists them — exactly the shape public/references/ expects, so the whole
   * library can be committed to the repo instead of living in one browser.
   */
  async function exportAll() {
    if (local.length === 0) return
    const taken = new Set<string>()
    const files = local.map((rec) => ({ rec, name: fileNameFor(rec, taken) }))
    for (const { rec, name } of files) {
      download(name, JSON.stringify(rec))
      // Browsers throttle rapid-fire downloads; space them out.
      await new Promise((r) => setTimeout(r, 300))
    }
    download('manifest.json', JSON.stringify({ files: files.map((f) => f.name) }, null, 2))
    window.alert(
      `Exported ${files.length} recording(s) + manifest.json.\n\n` +
        'Move them all into learn-ssl-module/web/public/references/ and commit — ' +
        'they then ship with the app for the whole team.',
    )
  }

  async function togglePlay(meta: RecordingMeta) {
    if (openIdRef.current === meta.id) {
      openIdRef.current = null
      setOpenId(null)
      setOpenRec(null)
      setOpenFailed(false)
      return
    }
    openIdRef.current = meta.id
    setOpenId(meta.id)
    setOpenRec(null)
    setOpenFailed(false)
    const full = await resolveFull(meta)
    // The learner may have opened a different row while this was in flight.
    if (openIdRef.current !== meta.id) return
    if (full) setOpenRec(full)
    else setOpenFailed(true)
  }

  async function handleDelete(meta: RecordingMeta) {
    if (!window.confirm(`Delete ${meta.gloss} by ${meta.signer}? This cannot be undone.`)) return
    await deleteRecording(meta.id)
    if (openIdRef.current === meta.id) {
      openIdRef.current = null
      setOpenId(null)
      setOpenRec(null)
    }
    await refreshLocal()
  }

  const needle = filter.trim().toLowerCase()
  const rows: Row[] = [
    ...local.map((rec) => ({ meta: toMeta(rec), bundled: false })),
    ...bundled.map((meta) => ({ meta, bundled: true })),
  ]
    .filter(
      ({ meta }) =>
        needle === '' ||
        meta.gloss.toLowerCase().includes(needle) ||
        meta.signer.toLowerCase().includes(needle),
    )
    .sort(
    (a, b) =>
      a.meta.gloss.localeCompare(b.meta.gloss) ||
      b.meta.createdAt.localeCompare(a.meta.createdAt),
  )

  return (
    <section className="library-card">
      <div className="library-head">
        <h2>Reference library</h2>
        <span className="library-count">
          {needle
            ? `${rows.length} match${rows.length === 1 ? '' : 'es'}`
            : `${local.length} local · ${bundled.length} bundled`}
        </span>
        <button
          className="btn btn-ghost"
          onClick={() => void exportAll()}
          disabled={local.length === 0}
          title={
            local.length === 0
              ? 'No local recordings to export'
              : 'Download every recording + manifest.json for committing to public/references/'
          }
        >
          Export all for repo
        </button>
        <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
          Import JSON
        </button>
        <input
          type="search"
          className="picker-search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by gloss or signer…"
          aria-label="Filter recordings"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          multiple
          hidden
          onChange={(e) => void handleImport(e.target.files)}
        />
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="empty-state">
          No recordings yet. Record your first reference sign in the <strong>Record</strong> tab —
          start with the seven avatar glosses (ME, YOU, NAME, WHAT, WHERE, CAN, YOUR).
        </p>
      ) : (
        <ul className="rec-list">
          {rows.map(({ meta, bundled: isBundled }) => (
            <li className="rec-row" key={meta.id}>
              <div className="rec-main">
                <span className="rec-gloss" title={translationOf(meta.gloss)}>
                  {glossLabel(meta.gloss)}
                  {isBundled && <em className="badge">bundled</em>}
                  {meta.provisional && (
                    <em
                      className="badge badge-warn"
                      title="Team recording — a stand-in for development, not authoritative SSL"
                    >
                      provisional
                    </em>
                  )}
                </span>
                <span className="rec-meta">
                  {meta.signer} · {(meta.durationMs / 1000).toFixed(1)} s · {meta.frameCount}{' '}
                  frames · {new Date(meta.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="rec-actions">
                <button className="btn btn-ghost" onClick={() => void togglePlay(meta)}>
                  {openId === meta.id ? 'Close' : 'Play'}
                </button>
                <button className="btn btn-ghost" onClick={() => void exportRecording(meta)}>
                  Export
                </button>
                {!isBundled && (
                  <button
                    className="btn btn-ghost btn-danger"
                    onClick={() => void handleDelete(meta)}
                  >
                    Delete
                  </button>
                )}
              </div>
              {openId === meta.id && (
                <div className="rec-player">
                  {openRec ? (
                    <SkeletonPlayer
                      frames={openRec.frames}
                      videoWidth={openRec.videoWidth}
                      videoHeight={openRec.videoHeight}
                    />
                  ) : openFailed ? (
                    <p className="camera-error">Could not load this recording.</p>
                  ) : (
                    <p className="hint-text">Loading frames…</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
