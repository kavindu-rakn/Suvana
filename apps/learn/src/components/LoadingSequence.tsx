import { useEffect, useState } from 'react'
import { activityCounter } from './loadingCounter'
import './LoadingSequence.css'

/** Compact activity animation. The camera's real starting/running/error state
 * owns its lifetime; the digits are decorative, not download percentages. */
export function LoadingSequence() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const counter = activityCounter(setCount, {
      now: () => performance.now(), request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id),
    }, matchMedia('(prefers-reduced-motion: reduce)').matches)
    return counter.cancel
  }, [])
  return <div className="camera-load-sequence" role="status">
    <span className="camera-load-brand" aria-hidden="true">SUVANA</span>
    <span className="camera-load-count" aria-hidden="true">{count}</span>
    <span>Opening camera…</span>
  </div>
}
