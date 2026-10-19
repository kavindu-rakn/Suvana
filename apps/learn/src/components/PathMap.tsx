import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { pathCurve, pathSlot } from './pathMapLayout'
import './PathMap.css'

export function PathMap({ children }: {
  children: ReactElement[]
}) {
  const canvas = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState({ curve: '', width: 1, height: 1 })
  const gradient = `path-gradient-${useId().replace(/:/g, '')}`

  useLayoutEffect(() => {
    const element = canvas.current
    if (!element) return
    let frame = 0
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      const points = [...element.querySelectorAll<HTMLElement>('.path-node')]
        .filter(node => node.getClientRects().length > 0)
        .map(node => {
          const rect = node.getBoundingClientRect()
          return { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top, width: rect.width }
        })
      setLine({ curve: pathCurve(points, bounds.width, matchMedia('(min-width: 900px)').matches), width: bounds.width, height: bounds.height })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    schedule()
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [children])

  return <div className="path-map">
    <div className="path-map-canvas" ref={canvas}>
      <svg className="path-route" viewBox={`0 0 ${line.width} ${line.height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--path-line-teal)" />
          <stop offset="50%" stopColor="var(--path-line-gold)" />
          <stop offset="100%" stopColor="var(--path-line-teal)" />
        </linearGradient></defs>
        <path className="path-route-halo" d={line.curve} stroke={`url(#${gradient})`} />
        <path d={line.curve} stroke={`url(#${gradient})`} />
      </svg>
      <ol className="path-units" aria-label="Lessons" role="list">
        {children.map((child, index) => {
          const slot = pathSlot(index)
          return <li key={child.key ?? index} value={index + 1} className="path-node"
            style={{ gridRow: slot.row, gridColumn: slot.column }}>{child}</li>
        })}
      </ol>
    </div>
  </div>
}
