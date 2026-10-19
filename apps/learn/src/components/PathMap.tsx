import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PATH_PAGE_SIZE, pathCurve, pathSlot } from './pathMapLayout'
import './PathMap.css'

export function PathMap({ children, page, onPage }: {
  children: ReactElement[]
  page: number
  onPage: (page: number) => void
}) {
  const canvas = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState({ curve: '', width: 1, height: 1 })
  const gradient = `path-gradient-${useId().replace(/:/g, '')}`
  const pages = Math.ceil(children.length / PATH_PAGE_SIZE)

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
          return { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top }
        })
      setLine({ curve: pathCurve(points, bounds.width, matchMedia('(min-width: 900px)').matches), width: bounds.width, height: bounds.height })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    schedule()
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [page, children])

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
          return <li key={child.key ?? index} value={index + 1} className={`path-node${Math.floor(index / PATH_PAGE_SIZE) === page ? ' path-node-current' : ''}`}
            style={{ gridRow: slot.row, gridColumn: slot.column }}>{child}</li>
        })}
      </ol>
    </div>
    <nav className="path-pagination" aria-label="Lesson pages">
      <button className="path-page-button" disabled={page === 0} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={18} aria-hidden="true" /> Previous
      </button>
      <p role="status" aria-live="polite">Lessons {page * PATH_PAGE_SIZE + 1}–{Math.min((page + 1) * PATH_PAGE_SIZE, children.length)} <span>of {children.length}</span></p>
      <button className="path-page-button" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
        Next <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  </div>
}
