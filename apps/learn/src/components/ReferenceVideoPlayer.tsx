import { useEffect, useMemo, useRef, useState } from 'react'
import { createPlayer, useMediaAttach } from '@videojs/react'
import { NeutralVideoSkin, videoFeatures } from '@videojs/react/video'
import '@videojs/react/video/neutral-skin.css'
import { drawHands, fitFor, interpolateHands } from '../vision/drawing'
import { LandmarkMedia } from './LandmarkMedia'
import type { SkeletonPlayerProps } from './SkeletonPlayer'
import './ReferenceVideoPlayer.css'

// Display-only interpolation; never bridge a tracking dropout. Untuned.
const MAX_BLEND_GAP_MS = 200

// Retain the learner's quarter/half/three-quarter-speed choices in the stock
// Video.js speed menu. The remaining video features use their standard setup.
const referenceFeatures: typeof videoFeatures = [...videoFeatures]
const rateFeature = referenceFeatures[1]
referenceFeatures[1] = {
  ...rateFeature,
  state: context => ({ ...rateFeature.state(context), playbackRates: [0.25, 0.5, 0.75, 1] }),
}
const { Player: VideoPlayer, usePlayer } = createPlayer({ features: referenceFeatures })

function LandmarkSurface({ frames, videoWidth, videoHeight, mirrored = true, fitToFrame = false, colorOverride }: SkeletonPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [media] = useState(() => new LandmarkMedia())
  const [zoomed, setZoomed] = useState(fitToFrame)
  const fit = useMemo(() => zoomed ? fitFor(frames, 0.85) : undefined, [frames, zoomed])
  // The same attachment hook used by Video.js's own media adapters. Isolated
  // here because this hook is internal; @videojs/react is pinned to 10.1.0.
  const attach = useMediaAttach()
  const speed = usePlayer(state => state.playbackRate)

  useEffect(() => {
    attach?.(media)
    return () => {
      media.destroy()
      attach?.(current => current === media ? null : current)
    }
  }, [attach, media])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let index = 0
    media.render = timeMs => {
      if (frames[index]?.timestampMs > timeMs) index = 0
      while (index + 1 < frames.length && frames[index + 1].timestampMs <= timeMs) index++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const frame = frames[index]
      if (!frame) return
      const next = frames[index + 1]
      const gap = next ? next.timestampMs - frame.timestampMs : 0
      const hands = next && gap > 0 && gap <= MAX_BLEND_GAP_MS
        ? interpolateHands(frame.hands, next.hands, (timeMs - frame.timestampMs) / gap)
        : frame.hands
      drawHands(ctx, hands, fit, colorOverride)
    }
    media.render(media.currentTime * 1000)
  }, [frames, fit, colorOverride, media])

  useEffect(() => {
    media.reset(frames.at(-1)?.timestampMs ?? 0, videoWidth, videoHeight)
    void media.play()
    return () => media.pause()
  }, [frames, videoWidth, videoHeight, media])

  return <div className="reference-content" data-speed={speed}>
    <div className="reference-stage">
      <canvas ref={canvasRef} width={videoWidth} height={videoHeight}
        role="img" aria-label="Recorded hand landmarks"
        className={`reference-canvas${mirrored ? ' mirrored' : ''}${zoomed ? '' : ' is-raw'}`} />
    </div>
    <div className="reference-framing">
      <div><span>{zoomed ? 'Zoomed to the hands' : 'Position in the original video frame'}</span>
        {mirrored && <span>Mirrored: copy it like a mirror</span>}</div>
      <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>Zoom to hands</button>
    </div>
  </div>
}

export default function ReferenceVideoPlayer(props: SkeletonPlayerProps) {
  return <div className="skeleton-player reference-player">
    <VideoPlayer>
      <NeutralVideoSkin className="reference-videojs">
        <LandmarkSurface {...props} />
      </NeutralVideoSkin>
    </VideoPlayer>
  </div>
}
