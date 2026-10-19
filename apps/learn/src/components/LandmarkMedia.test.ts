import { describe, expect, it, vi } from 'vitest'
import { LandmarkMedia } from './LandmarkMedia'

function setup() {
  let now = 0, id = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  const media = new LandmarkMedia({
    now: () => now,
    request: callback => { callbacks.set(++id, callback); return id },
    cancel: key => { callbacks.delete(key) },
  })
  media.reset(2000, 640, 480)
  const render = vi.fn()
  media.render = render
  return { media, render, callbacks, advance: (ms: number) => {
    now += ms
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach(callback => callback(now))
  } }
}

describe('LandmarkMedia Video.js adapter', () => {
  it('starts every reference at normal speed and converts seconds to landmark milliseconds', async () => {
    const { media, render, advance } = setup()
    expect(media.playbackRate).toBe(1)
    expect(media.duration).toBe(2)
    await media.play()
    advance(500)
    expect(media.currentTime).toBe(0.5)
    expect(render).toHaveBeenLastCalledWith(500)
    media.playbackRate = 0.5
    advance(500)
    expect(media.currentTime).toBe(0.75)
    media.reset(1000, 1280, 720)
    expect(media.playbackRate).toBe(1)
    expect(media.currentTime).toBe(0)
    expect(media.paused).toBe(true)
    expect(media.videoWidth).toBe(1280)
  })

  it('pauses, resumes, loops and never queues duplicate animation frames', async () => {
    const { media, advance, callbacks } = setup()
    await media.play()
    await media.play()
    expect(callbacks.size).toBe(1)
    advance(1500)
    media.pause()
    expect(callbacks.size).toBe(0)
    advance(1000)
    expect(media.currentTime).toBe(1.5)
    await media.play()
    advance(750)
    expect(media.currentTime).toBe(0.25)
    expect(media.paused).toBe(false)
    media.destroy()
    expect(callbacks.size).toBe(0)
  })

  it('seeks immediately while paused, clamps invalid positions and reports media events', () => {
    const { media, render } = setup()
    const events: string[] = []
    for (const type of ['seeking', 'timeupdate', 'seeked', 'ratechange']) media.addEventListener(type, () => events.push(type))
    media.currentTime = 1.25
    expect(render).toHaveBeenLastCalledWith(1250)
    expect(events).toEqual(['seeking', 'timeupdate', 'seeked'])
    expect(media.seeking).toBe(false)
    media.currentTime = 50
    expect(media.currentTime).toBe(2)
    media.currentTime = -1
    expect(media.currentTime).toBe(0)
    media.currentTime = NaN
    media.playbackRate = 0
    expect(media.currentTime).toBe(0)
    expect(media.playbackRate).toBe(1)
    media.playbackRate = 0.5
    expect(events.at(-1)).toBe('ratechange')
  })

  it('finishes non-looping playback and can restart from the end', async () => {
    const { media, advance, callbacks } = setup()
    const ended = vi.fn()
    media.loop = false
    media.addEventListener('ended', ended)
    await media.play()
    advance(2500)
    expect(media.currentTime).toBe(2)
    expect(media.ended).toBe(true)
    expect(media.paused).toBe(true)
    expect(ended).toHaveBeenCalledOnce()
    expect(callbacks.size).toBe(0)
    await media.play()
    advance(100)
    expect(media.currentTime).toBeCloseTo(0.1)
    expect(media.ended).toBe(false)
  })
})
