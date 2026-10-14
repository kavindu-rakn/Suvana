import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAMERA_LOSS_GRACE_MS, NO_CAMERA_INTERRUPTION, cameraInterruptionTransition,
  cameraRestoreAction, captureDeadline, releaseStream, watchStream, withCpuFallback } from './cameraLifecycle'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('camera lifecycle', () => {
  it('restarts a background-lost camera once when it returns to a visible page', () => {
    const state = { hidden: false, wasRunningWhenHidden: true, streamUsable: false, starting: false, restoring: false }
    expect(cameraRestoreAction(state)).toBe('restart')
    expect(cameraRestoreAction({ ...state, restoring: true })).toBe('none')
    expect(cameraRestoreAction({ ...state, starting: true })).toBe('none')
    expect(cameraRestoreAction({ ...state, wasRunningWhenHidden: false })).toBe('none')
    expect(cameraRestoreAction({ ...state, hidden: true })).toBe('none')
  })
  it('plays a still-live Android stream without reopening a camera', () => {
    expect(cameraRestoreAction({ hidden: false, wasRunningWhenHidden: true,
      streamUsable: true, starting: false, restoring: false })).toBe('play')
  })
  it('keeps an explicitly stopped or visibly lost camera off on page show', () => {
    expect(cameraRestoreAction({ hidden: false, wasRunningWhenHidden: false,
      streamUsable: false, starting: false, restoring: false })).toBe('none')
  })
  it('falls back once after GPU failure', async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error('WebGL lost')).mockResolvedValue('cpu')
    expect(await withCpuFallback(create)).toBe('cpu')
    expect(create.mock.calls).toEqual([['GPU'], ['CPU']])
  })

  it('keeps GPU when available and reports CPU failure without retrying', async () => {
    const gpu = vi.fn().mockResolvedValue('gpu')
    expect(await withCpuFallback(gpu)).toBe('gpu')
    expect(gpu).toHaveBeenCalledTimes(1)
    const broken = vi.fn().mockRejectedValue(new Error('model unavailable'))
    await expect(withCpuFallback(broken)).rejects.toThrow('model unavailable')
    expect(broken).toHaveBeenCalledTimes(2)
  })

  it('distinguishes mute/unmute/end and clears handlers before releasing every track', () => {
    const disconnected = vi.fn()
    const track = { onended: null, onmute: null, onunmute: null, stop: vi.fn(() => {
      expect(track.onended).toBeNull()
      expect(track.onmute).toBeNull()
      expect(track.onunmute).toBeNull()
    }) } as unknown as MediaStreamTrack
    const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
    watchStream(stream, disconnected)
    track.onmute?.call(track, new Event('mute'))
    track.onunmute?.call(track, new Event('unmute'))
    track.onended?.call(track, new Event('ended'))
    expect(disconnected.mock.calls).toEqual([['mute'], ['unmute'], ['ended']])
    releaseStream(stream)
    expect(track.stop).toHaveBeenCalledOnce()
    releaseStream(null)
  })

  it('ends capture without any frames and cancels stale deadlines', () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    const finish = vi.fn()
    const cancel = captureDeadline(4000, finish)
    vi.advanceTimersByTime(3999)
    expect(finish).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(finish).toHaveBeenCalledOnce()
    cancel()
    captureDeadline(4000, finish)()
    vi.advanceTimersByTime(4000)
    expect(finish).toHaveBeenCalledOnce()
  })
})

describe('iOS interruption event order', () => {
  it.each(['mute', 'ended'] as const)('defers %s before hidden and recognizes the subsequent switch', (event) => {
    const loss = cameraInterruptionTransition(NO_CAMERA_INTERRUPTION, event, 100)
    expect(loss.action).toBe('pause')
    expect(loss.state.interrupted).toBe(false)
    const hidden = cameraInterruptionTransition(loss.state, 'away', 100 + CAMERA_LOSS_GRACE_MS)
    expect(hidden.state.interrupted).toBe(true)
    expect(cameraInterruptionTransition(hidden.state, 'timeout', 5000).action).toBe('none')
    const returned = cameraInterruptionTransition(hidden.state, 'return', 6000)
    expect(cameraRestoreAction({ hidden: returned.state.away, wasRunningWhenHidden: returned.state.interrupted,
      streamUsable: false, starting: false, restoring: false })).toBe('restart')
  })
  it.each(['mute', 'ended'] as const)('recognizes hidden before %s', (event) => {
    const hidden = cameraInterruptionTransition(NO_CAMERA_INTERRUPTION, 'away', 100)
    const loss = cameraInterruptionTransition(hidden.state, event, 5000)
    expect(loss.state.interrupted).toBe(true)
    expect(cameraInterruptionTransition(loss.state, 'timeout', 7000).action).toBe('none')
  })
  it('fails a loss that stays visible, without extending grace for repeated events', () => {
    const first = cameraInterruptionTransition(NO_CAMERA_INTERRUPTION, 'mute', 100)
    const repeated = cameraInterruptionTransition(first.state, 'ended', 1000)
    expect(repeated.state.lostAt).toBe(100)
    expect(cameraInterruptionTransition(repeated.state, 'timeout', 1600).action).toBe('fail')
    expect(cameraInterruptionTransition(first.state, 'away', 1601).action).toBe('fail')
  })
  it('resumes a visible mute when unmute arrives; an ended track cannot unmute', () => {
    const muted = cameraInterruptionTransition(NO_CAMERA_INTERRUPTION, 'mute', 100)
    expect(cameraInterruptionTransition(muted.state, 'unmute', 200))
      .toEqual({ state: NO_CAMERA_INTERRUPTION, action: 'resume' })
    const ended = cameraInterruptionTransition(muted.state, 'ended', 150)
    expect(cameraInterruptionTransition(ended.state, 'unmute', 200).state.ended).toBe(true)
  })
  it('clears a background mute on unmute without starting inference while away', () => {
    const away = cameraInterruptionTransition(NO_CAMERA_INTERRUPTION, 'away', 100)
    const muted = cameraInterruptionTransition(away.state, 'mute', 200)
    const unmuted = cameraInterruptionTransition(muted.state, 'unmute', 300)
    expect(unmuted.action).toBe('none')
    expect(unmuted.state).toEqual({ ...NO_CAMERA_INTERRUPTION, away: true })
  })
})
