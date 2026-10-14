import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

it('records nothing unless camdebug=1 and keeps only the last 80 events in order', async () => {
  const location = { search: '?camdebug=0' }
  vi.stubGlobal('window', { location })
  vi.stubGlobal('document', { hidden: false })
  const log = await import('./cameraDebug')
  const notify = vi.fn()
  const unsubscribe = log.subscribeCameraDebug(notify)
  log.recordCameraEvent('mute')
  expect(log.cameraDebugSnapshot()).toEqual([])
  expect(notify).not.toHaveBeenCalled()
  location.search = '?camdebug=1'
  for (let i = 0; i < 81; i++) log.recordCameraEvent('event-' + i, 'live')
  const events = log.cameraDebugSnapshot()
  expect(events).toHaveLength(80)
  expect(events[0].event).toBe('event-1')
  expect(events[79]).toMatchObject({ event: 'event-80', hidden: false, detail: 'live' })
  expect(events[79].time).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
  expect(notify).toHaveBeenCalledTimes(81)
  unsubscribe()
  log.recordCameraEvent('focus')
  expect(notify).toHaveBeenCalledTimes(81)
})
