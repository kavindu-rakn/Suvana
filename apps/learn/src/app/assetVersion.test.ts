import { describe, expect, it } from 'vitest'
import { ASSET_VERSION, withAssetVersion } from './assetVersion'

describe('asset version URLs', () => {
  it('versions assets at both the standalone and Suvana deployment bases', () => {
    for (const base of ['/', '/learn/']) {
      for (const asset of ['reference-index.json', 'references/fixture.json', 'models/hand_landmarker.task', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_nosimd_internal.wasm']) {
        expect(withAssetVersion(`${base}${asset}`)).toBe(`${base}${asset}?v=${ASSET_VERSION}`)
      }
    }
  })

  it('replaces an old version while preserving other parameters and fragments', () => {
    expect(withAssetVersion('/learn/references/fixture.json?lang=en&v=old#frames'))
      .toBe(`/learn/references/fixture.json?lang=en&v=${ASSET_VERSION}#frames`)
    expect(withAssetVersion('/models/hand_landmarker.task#model'))
      .toBe(`/models/hand_landmarker.task?v=${ASSET_VERSION}#model`)
  })
})
