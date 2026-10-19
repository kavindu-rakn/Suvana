import { lazy, Suspense } from 'react'
import type { HandFrame } from '../vision/types'

export interface SkeletonPlayerProps {
  frames: HandFrame[]
  videoWidth: number
  videoHeight: number
  mirrored?: boolean
  fitToFrame?: boolean
  colorOverride?: string
}

// Keep the player and its skin out of the initial Learn bundle.
const ReferenceVideoPlayer = lazy(() => import('./ReferenceVideoPlayer'))

export function SkeletonPlayer(props: SkeletonPlayerProps) {
  return <Suspense fallback={<p role="status">Loading reference player…</p>}>
    <ReferenceVideoPlayer {...props} />
  </Suspense>
}
