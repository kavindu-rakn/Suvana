import { useEffect, useMemo, useRef, useState } from 'react'
import type { SignRecording } from '../vision/types'
import type { ScoreResult } from '../scoring/score'
import { drawHands, fitFor } from '../vision/drawing'
import { buildReplayPlan, replayFocusStep, replayStepAt } from './replayPlan'
import './ReplayCompare.css'

export function ReplayCompare({ reference, attempt, result }: {
  reference: SignRecording; attempt: SignRecording; result: ScoreResult
}) {
  const plan = useMemo(() => buildReplayPlan(reference.frames, attempt.frames, result.alignment), [reference, attempt, result.alignment])
  const focus = replayFocusStep(plan, result.worstFrameIndex)
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [cursor, setCursor] = useState(reduced && focus >= 0 ? focus : 0)
  const [playing, setPlaying] = useState(!reduced && focus !== 0 && plan.length > 1)
  const [zoomed, setZoomed] = useState(true)
  const [atFocus, setAtFocus] = useState(focus === 0 || (reduced && focus >= 0))
  const offset = useRef(reduced && focus >= 0 ? plan[focus].timeMs : 0)
  const autoPause = useRef(!reduced && focus > 0)
  const referenceCanvas = useRef<HTMLCanvasElement>(null)
  const attemptCanvas = useRef<HTMLCanvasElement>(null)
  const duration = plan.at(-1)?.timeMs ?? 0
  const referenceFit = useMemo(() => zoomed ? fitFor(reference.frames) : undefined, [reference, zoomed])
  const attemptFit = useMemo(() => zoomed ? fitFor(attempt.frames) : undefined, [attempt, zoomed])
  const pair = plan[cursor]

  useEffect(() => {
    if (!playing || !plan.length) return
    const started = performance.now(), from = offset.current
    let raf = 0
    const frame = () => {
      const time = Math.min(duration, from + (performance.now() - started) * 0.5)
      if (autoPause.current && focus >= 0 && time >= plan[focus].timeMs) {
        autoPause.current = false
        offset.current = plan[focus].timeMs
        setCursor(focus)
        setAtFocus(true)
        setPlaying(false)
        return
      }
      offset.current = time
      setCursor(replayStepAt(plan, time))
      if (time >= duration) { setPlaying(false); return }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing, plan, duration, focus])

  useEffect(() => {
    if (!pair) return
    for (const [canvas, recording, index, fit] of [
      [referenceCanvas.current, reference, pair.referenceIndex, referenceFit],
      [attemptCanvas.current, attempt, pair.attemptIndex, attemptFit],
    ] as const) {
      const ctx = canvas?.getContext('2d')
      if (!ctx || !canvas) continue
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawHands(ctx, recording.frames[index].hands, fit, '#e6eeec')
    }
  }, [pair, reference, attempt, referenceFit, attemptFit])

  function seek(index: number) {
    if (!plan[index]) return
    setPlaying(false)
    autoPause.current = false
    offset.current = plan[index].timeMs
    setCursor(index)
    setAtFocus(index === focus)
  }
  if (!pair) return <p className="replay-unavailable">No matched replay for this try. Watch the reference and try again.</p>
  return <section className="replay-compare" aria-label="Compare the two takes" data-step={cursor} data-playing={playing} data-focus={atFocus}>
    <div className="replay-panes">
      <figure><figcaption>Reference</figcaption><canvas ref={referenceCanvas} role="img" aria-label="Reference hand replay" className="mirrored" data-frame-index={pair.referenceIndex} width={reference.videoWidth} height={reference.videoHeight} /></figure>
      <figure><figcaption>Your try{result.mirrored && <small>Other hand matched</small>}</figcaption><canvas ref={attemptCanvas} role="img" aria-label="Your hand replay" className={result.mirrored ? undefined : 'mirrored'} data-frame-index={pair.attemptIndex} width={attempt.videoWidth} height={attempt.videoHeight} /></figure>
    </div>
    <p className="replay-caption">{zoomed ? 'Zoomed to hands' : 'Position in the original video frame'} · 0.5×</p>
    <div className="replay-controls">
      <button className="btn ghost" onClick={() => { setAtFocus(false); autoPause.current = false; setPlaying(value => !value) }}>{playing ? 'Pause replay' : 'Play replay'}</button>
      <button className="btn ghost" onClick={() => { offset.current = 0; setCursor(0); autoPause.current = focus > 0; setAtFocus(focus === 0); setPlaying(focus !== 0) }}>Replay from start</button>
      <button className="btn ghost" disabled={focus < 0} onClick={() => seek(focus)}>Look at this moment</button>
      <button className="btn ghost" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>Zoom to hands</button>
    </div>
    <label className="replay-seek">Move through both takes<input aria-label="Scrub both takes" type="range" min={0} max={plan.length - 1} value={cursor} onChange={event => seek(Number(event.target.value))} /></label>
    <p role="status" className="replay-status">{atFocus ? 'Paused at a moment to compare.' : playing ? 'Playing both takes at half speed.' : 'Replay paused.'}</p>
  </section>
}
