import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ASSET_VERSION } from '../app/assetVersion'

const mocks = vi.hoisted(() => ({ resolver: vi.fn(), create: vi.fn() }))
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mocks.resolver },
  HandLandmarker: { createFromOptions: mocks.create },
}))

beforeEach(() => {
  vi.resetModules()
  mocks.resolver.mockReset()
  mocks.create.mockReset()
})

describe('versioned hand tracker assets', () => {
  it('shares an in-flight preparation promise with camera starts and reports readiness', async () => {
    mocks.resolver.mockResolvedValue({ wasmLoaderPath: '/runtime.js', wasmBinaryPath: '/runtime.wasm' })
    let ready!: (tracker: unknown) => void
    mocks.create.mockImplementation(() => new Promise((resolve) => { ready = resolve }))
    const tracker = await import('./handTracker')
    const notify = vi.fn()
    const unsubscribe = tracker.subscribeHandTracker(notify)
    expect(tracker.handTrackerLoadStatus()).toBe('idle')
    const preparation = tracker.getHandLandmarker()
    const cameraStart = tracker.getHandLandmarker()
    expect(cameraStart).toBe(preparation)
    expect(tracker.handTrackerLoadStatus()).toBe('loading')
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    ready('ready tracker')
    expect(await cameraStart).toBe('ready tracker')
    expect(tracker.handTrackerLoadStatus()).toBe('ready')
    expect(notify).toHaveBeenCalledTimes(2)
    unsubscribe()
    expect(mocks.resolver).toHaveBeenCalledOnce()
  })
  it.each(['vision_wasm_internal', 'vision_wasm_nosimd_internal'])(
    'versions the resolved %s files and model, retaining the shared instance', async (variant) => {
      const base = import.meta.env.BASE_URL
      mocks.resolver.mockResolvedValue({
        wasmLoaderPath: `${base}wasm/${variant}.js`,
        wasmBinaryPath: `${base}wasm/${variant}.wasm`,
      })
      const tracker = { detectForVideo: vi.fn() }
      mocks.create.mockResolvedValue(tracker)
      const { getHandLandmarker } = await import('./handTracker')
      const pending = getHandLandmarker()
      expect(getHandLandmarker()).toBe(pending)
      expect(await pending).toBe(tracker)
      expect(mocks.resolver).toHaveBeenCalledWith(`${base}wasm`)
      expect(mocks.create).toHaveBeenCalledWith({
        wasmLoaderPath: `${base}wasm/${variant}.js?v=${ASSET_VERSION}`,
        wasmBinaryPath: `${base}wasm/${variant}.wasm?v=${ASSET_VERSION}`,
      }, expect.objectContaining({ baseOptions: {
        delegate: 'GPU',
        modelAssetPath: `${base}models/hand_landmarker.task?v=${ASSET_VERSION}`,
      } }))
    },
  )

  it('keeps versioned URLs on CPU fallback and allows retry after both delegates fail', async () => {
    mocks.resolver.mockResolvedValue({ wasmLoaderPath: '/wasm/runtime.js', wasmBinaryPath: '/wasm/runtime.wasm' })
    mocks.create.mockRejectedValueOnce(new Error('GPU failed')).mockRejectedValueOnce(new Error('CPU failed')).mockResolvedValue('retry succeeded')
    const { getHandLandmarker, handTrackerLoadStatus } = await import('./handTracker')
    await expect(getHandLandmarker()).rejects.toThrow('CPU failed')
    expect(handTrackerLoadStatus()).toBe('error')
    expect(await getHandLandmarker()).toBe('retry succeeded')
    expect(handTrackerLoadStatus()).toBe('ready')
    expect(mocks.create.mock.calls.map((call) => call[1].baseOptions.delegate)).toEqual(['GPU', 'CPU', 'GPU'])
    for (const call of mocks.create.mock.calls) {
      expect(call[0].wasmBinaryPath).toBe(`/wasm/runtime.wasm?v=${ASSET_VERSION}`)
      expect(call[1].baseOptions.modelAssetPath).toContain(`?v=${ASSET_VERSION}`)
    }
  })
})
