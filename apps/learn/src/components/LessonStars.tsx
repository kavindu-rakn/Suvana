import { Lock, Star, StarCheck, StarHalf } from 'lucide-react'
import type { Stars } from '../learner/game'
import './LessonStars.css'

/** The least-complete sign sets the lesson's earned star milestone. */
export function LessonStars({ stars, locked = false }: { stars: readonly Stars[]; locked?: boolean }) {
  if (locked) return <span className="lesson-stars" role="img" aria-label="Locked" title="Locked">
    <Lock size={24} aria-hidden="true" />
  </span>
  if (!stars.length || stars.includes(0)) return null
  const minimum = Math.min(...stars)
  const Icon = minimum === 3 ? Star : minimum === 2 ? StarCheck : StarHalf
  const label = minimum === 3 ? 'All stars earned' : `At least ${minimum} ${minimum === 1 ? 'star' : 'stars'} on every sign`
  return <span className="lesson-stars" role="img" aria-label={label} title={label}>
    <Icon size={24} aria-hidden="true" />
  </span>
}
