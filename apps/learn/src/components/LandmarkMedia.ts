interface AnimationClock {
  now(): number
  request(callback: FrameRequestCallback): number
  cancel(id: number): void
}

const browserClock: AnimationClock = {
  now: () => performance.now(),
  request: callback => requestAnimationFrame(callback),
  cancel: id => cancelAnimationFrame(id),
}

/** Video.js media adapter for recorded landmarks. No encoded video or network. */
export class LandmarkMedia extends EventTarget {
  paused = true
  ended = false
  seeking = false
  loop = true
  defaultPlaybackRate = 1
  readonly readyState = 4
  readonly error = null
  src = ''
  readonly currentSrc = ''
  preload = 'auto' as const
  crossOrigin = null
  duration = 0.001
  videoWidth = 0
  videoHeight = 0
  render: (timeMs: number) => void = () => {}
  private position = 0
  private rate = 1
  private lastTick = 0
  private animation: number | undefined

  private clock: AnimationClock
  constructor(clock: AnimationClock = browserClock) { super(); this.clock = clock }
  private emit(type: string) { this.dispatchEvent(new Event(type)) }
  get buffered() { return { length: 1, start: () => 0, end: () => this.duration } }
  get seekable() { return this.buffered }
  get currentTime() { return this.position }
  set currentTime(value: number) {
    if (!Number.isFinite(value)) return
    this.seeking = true
    this.emit('seeking')
    this.position = Math.max(0, Math.min(this.duration, value))
    this.lastTick = this.clock.now()
    this.ended = false
    this.render(this.position * 1000)
    this.emit('timeupdate')
    this.seeking = false
    this.emit('seeked')
  }
  get playbackRate() { return this.rate }
  set playbackRate(value: number) {
    if (!Number.isFinite(value) || value <= 0) return
    if (!this.paused) this.advance(this.clock.now())
    this.rate = value
    this.emit('ratechange')
  }
  reset(durationMs: number, width: number, height: number) {
    this.pause()
    this.duration = Math.max(Number.isFinite(durationMs) ? durationMs / 1000 : 0, 0.001)
    this.videoWidth = width
    this.videoHeight = height
    this.playbackRate = 1
    this.currentTime = 0
    for (const event of ['durationchange', 'loadedmetadata', 'resize', 'canplay', 'progress']) this.emit(event)
  }
  load() { this.emit('canplay') }
  canPlayType() { return '' as const }
  async play() {
    if (!this.paused) return
    if (this.ended || this.position >= this.duration) this.currentTime = 0
    this.paused = false
    this.lastTick = this.clock.now()
    this.emit('play')
    this.emit('playing')
    this.animation = this.clock.request(this.tick)
  }
  pause() {
    if (!this.paused) this.advance(this.clock.now())
    this.paused = true
    if (this.animation !== undefined) this.clock.cancel(this.animation)
    this.animation = undefined
    this.emit('pause')
  }
  private advance(now: number) {
    const next = this.position + Math.max(0, now - this.lastTick) / 1000 * this.rate
    this.lastTick = now
    this.position = this.loop ? next % this.duration : Math.min(next, this.duration)
    this.render(this.position * 1000)
    this.emit('timeupdate')
    if (!this.loop && next >= this.duration) {
      this.paused = true
      this.ended = true
      this.emit('ended')
    }
  }
  private tick = (now: number) => {
    this.animation = undefined
    if (this.paused) return
    this.advance(now)
    if (!this.paused) this.animation = this.clock.request(this.tick)
  }
  destroy() { this.pause(); this.render = () => {} }
}
