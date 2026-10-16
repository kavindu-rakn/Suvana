import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SENTENCES, SENTENCE_EXPERIMENTAL_LABEL, isSentenceReference, isSentenceGloss } from './sentences'
import { translationOf } from './translations'
import { pickReferences } from '../storage/references'
import { summarizeAll, recommendNext } from '../learner/mastery'
import { buildSessionPlan } from '../learner/session'
import type { SignRecording, RecordingMeta } from '../vision/types'
import { toMeta } from '../vision/types'

const recordings = SENTENCES.map(row => JSON.parse(readFileSync(`public/references/${row.file}`, 'utf8')) as
  SignRecording & { sourceLabel: string; sourceFile: string; licence: string })

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })

describe('experimental whole-clip sentences', () => {
  it('separates the loader APIs while allowing explicit CC0 sentence frame requests', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CONTENT', 'cc0')
    const packed = JSON.parse(readFileSync('public/reference-index.json', 'utf8'))
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(packed)))
      .mockResolvedValueOnce(new Response(readFileSync(`public/references/${SENTENCES[0]!.file}`, 'utf8')))
    vi.stubGlobal('fetch', fetchMock)
    const { loadReferenceIndex, loadSentenceReferenceIndex, loadReferenceFrames } = await import('../storage/bundledReferences')
    const singles = await loadReferenceIndex()
    const sentences = await loadSentenceReferenceIndex()
    expect(singles).toHaveLength(141)
    expect(singles.some(isSentenceReference)).toBe(false)
    expect(sentences).toHaveLength(19)
    expect(sentences.every(isSentenceReference)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await loadReferenceFrames(SENTENCES[0]!.file)).toEqual(recordings[0])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('preserves all 19 converter labels, including case, parentheses and trailing spaces', () => {
    expect(SENTENCES).toHaveLength(19)
    expect(new Set(SENTENCES.map(row => row.refId)).size).toBe(19)
    for (const [i, row] of SENTENCES.entries()) {
      const raw = recordings[i]!
      expect(row.refId).toBe(raw.id)
      expect(row.datasetLabel).toBe(raw.sourceLabel)
      expect(raw.sourceFile).toBe(`${row.datasetLabel}.mp4`)
      expect(row.gloss).toBe(raw.gloss)
      expect(row.meaning).toBe(translationOf(row.gloss))
    }
    expect(SENTENCES.filter(row => row.datasetLabel.endsWith(' '))).toHaveLength(2)
    expect(SENTENCES.some(row => row.datasetLabel === 'doctor koheda inne' || !row.datasetLabel)).toBe(false)
    expect(SENTENCE_EXPERIMENTAL_LABEL).toBe('Experimental: whole-sentence match, not calibrated')
  })

  it('keeps committed sentences out of the isolated-sign picker and recommendation queues', () => {
    const single = JSON.parse(readFileSync('public/references/kaggle_100.json', 'utf8')) as SignRecording
    const all = [single, ...recordings]
    expect([...pickReferences(all.map(toMeta)).values()]).toEqual([toMeta(single)])
    expect(recordings.every(isSentenceReference)).toBe(true)
    expect(SENTENCES.every(row => isSentenceGloss(row.gloss))).toBe(true)
    expect(isSentenceReference({ file: 'kaggle_sent_future.json' })).toBe(true)
    const summaries = summarizeAll(all.map(row => row.gloss), [])
    expect(recommendNext(summaries)?.gloss).toBe(single.gloss)
    expect(buildSessionPlan(summaries, 30).map(row => row.gloss)).toEqual([single.gloss])
    const attempted = summaries.map(row => ({ ...row, attempts: 3, mastery: 0.1 }))
    expect(buildSessionPlan(attempted, 30).map(row => row.gloss)).toEqual([single.gloss])
    expect(recommendNext(attempted.filter(row => row.gloss !== single.gloss))).toBeNull()
  })

  it('retains sentence CC0 provenance and the existing dataset credit in the generated index', () => {
    const packed = JSON.parse(readFileSync('public/reference-index.json', 'utf8')) as {
      sources: Record<string, Partial<RecordingMeta>>; recordings: RecordingMeta[]
    }
    const index = packed.recordings.map(rec => ({ ...(rec.source ? packed.sources[rec.source] : {}), ...rec }))
    const credit = index.find(rec => rec.file === 'kaggle_100.json')!.attribution
    for (const row of SENTENCES) {
      const meta = index.find(rec => rec.file === row.file)!
      expect(meta.id).toBe(row.refId)
      expect(meta.licence).toBe('CC0-1.0')
      expect(meta.attribution).toBe(credit)
      expect(meta.sourceCategory).toBe('SSL Sentences')
    }
  })
})
