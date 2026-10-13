import { afterEach, describe, expect, it, vi } from 'vitest'
import { cameraRestoreAction, captureDeadline, releaseStream, watchStream, withCpuFallback } from './cameraLifecycle'

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

  it('detects mute/end and clears handlers before releasing every track', () => {
    const disconnected = vi.fn()
    const track = { onended: null, onmute: null, stop: vi.fn(() => {
      expect(track.onended).toBeNull()
      expect(track.onmute).toBeNull()
    }) } as unknown as MediaStreamTrack
    const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
    watchStream(stream, disconnected)
    track.onmute?.call(track, new Event('mute'))
    track.onended?.call(track, new Event('ended'))
    expect(disconnected).toHaveBeenCalledTimes(2)
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
