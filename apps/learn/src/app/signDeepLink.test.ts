import { describe, expect, it } from 'vitest'
import { filterContentIndex } from '../storage/bundledReferences'
import { SENTENCES } from '../data/sentences'
import { matchSignDeepLink } from './signDeepLink'
import type { RecordingMeta } from '../vision/types'

const cc0: RecordingMeta = {
  id: 'test-bag', gloss: 'BAG EKA', file: 'kaggle_BAG_EKA.json',
  source: 'kaggle-dataset', licence: 'CC0-1.0', signer: 'test', createdAt: '',
  durationMs: 1000, fps: 10, frameCount: 10, videoWidth: 640, videoHeight: 480,
}
const nc: RecordingMeta = {
  ...cc0, id: 'yohan_test', gloss: 'HELLO', file: 'yohan_test.json',
  source: 'yohan-dataset', licence: 'CC-BY-NC-SA-4.0',
}
const index = [cc0, nc]

describe('sign deep link matching', () => {
  it('accepts only an exact gloss, including URL-encoded spaces', () => {
    expect(matchSignDeepLink('?sign=BAG%20EKA', index)).toBe('BAG EKA')
    expect(matchSignDeepLink('?other=1&sign=BAG+EKA', index)).toBe('BAG EKA')
    expect(matchSignDeepLink('?sign=BAG%2520EKA', index)).toBeNull()
  })

  it.each(['', '?sign', '?sign=', '?sign=unknown', '?sign=bag%20eka',
    '?sign=Bag%20Eka', '?sign=%20BAG%20EKA', '?sign=BAG%20EKA%20', '?sign=test-bag',
  ])('ignores absent, empty, unknown, differently cased or padded values: %s', search => {
    expect(matchSignDeepLink(search, index)).toBeNull()
  })

  it('rejects sentences even in an index containing sentence metadata', () => {
    const sentence = SENTENCES[0]
    const query = `?sign=${encodeURIComponent(sentence.gloss)}`
    expect(matchSignDeepLink(query, [{ ...cc0, ...sentence, id: sentence.refId }])).toBeNull()
    expect(matchSignDeepLink('?sign=BAG%20EKA', [{ ...cc0, sourceCategory: 'SSL Sentences' }])).toBeNull()
    expect(matchSignDeepLink('?sign=BAG%20EKA', [{ ...cc0, file: 'kaggle_sent_test.json' }])).toBeNull()
  })

  it('uses the supplied edition: NC-only glosses disappear in CC0', () => {
    expect(matchSignDeepLink('?sign=HELLO', filterContentIndex(index, 'all'))).toBe('HELLO')
    expect(matchSignDeepLink('?sign=HELLO', filterContentIndex(index, 'cc0'))).toBeNull()
    expect(matchSignDeepLink('?sign=BAG%20EKA', filterContentIndex(index, 'cc0'))).toBe('BAG EKA')
    expect(matchSignDeepLink('?sign=BAG%20EKA', [])).toBeNull()
  })
})
