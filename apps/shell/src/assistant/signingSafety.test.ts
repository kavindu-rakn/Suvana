import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { GENERAL_TIPS, SignKnowledgeBase } from './kb'
import { localAnswer } from './engine'
import { handleAssistant } from './handler'
import { SIGNING_REFUSAL, signingRefusal } from './signingSafety'
import { SYSTEM_PROMPT } from './model'

const kb = new SignKnowledgeBase([])
const prompts = [
  'how do I sign X', 'translate Y to SSL', 'describe the handshape for Z', 'how do I sign hello',
  'How can I sign HELLO?', 'please demonstrate the sign for HELLO',
  'explain the movement for HELLO', 'describe the position for HELLO',
  'show me how to sign HELLO', 'sign HELLO', 'translate HELLO into sign language',
  'HELLO සංඥා භාෂාවෙන් කොහොමද කරන්නේ?',
  'සංඥා භාෂාවට පරිවර්තනය කරන්න', 'අතේ පිහිටීම විස්තර කරන්න',
]

describe('content safety', () => {
  it.each(prompts)('refuses before fuzzy retrieval, even without an index: %s', message => {
    const answer = localAnswer(kb, message)
    expect(answer.text).toBe(SIGNING_REFUSAL)
    expect(answer.refused).toBe(true)
    expect(answer.cards).toEqual([])
    expect(answer.learnUrl).toMatch(/^https:\/\/suvana\.help\/learn\//)
  })

  it('links only an exact existing gloss, retaining case and encoded spaces', () => {
    expect(signingRefusal('how do I sign HELLO')?.learnUrl).toBe('https://suvana.help/learn/?sign=HELLO')
    expect(signingRefusal('how do I sign BAG EKA')?.learnUrl).toBe('https://suvana.help/learn/?sign=BAG%20EKA')
    expect(signingRefusal('translate HELLO to sign language')?.learnUrl).toBe('https://suvana.help/learn/?sign=HELLO')
    for (const target of ['hello', 'unknown', 'THANK_YOU', 'MAGE NAMA']) {
      expect(signingRefusal(`how do I sign ${target}`)?.learnUrl).toBe('https://suvana.help/learn/')
    }
  })

  it('does not turn ordinary label browsing or camera advice into signing instructions', () => {
    for (const message of ['hello', 'show me the letters', 'practice tips', 'how do I improve camera lighting?']) {
      expect(signingRefusal(message)).toBeNull()
    }
  })

  it('all category cards use only camera tips, with no sign-form or category guidance', () => {
    const populated = new SignKnowledgeBase(['letter', 'number', 'month', 'phrase'].map(category => ({ label: category, sinhala: '', english: '', category })))
    for (const entry of populated.entries) {
      const tips = populated.card(entry).tips
      expect(tips).toEqual(GENERAL_TIPS)
      expect(tips.join(' ')).not.toMatch(/handshape|finger|palm|chest|pose|fingerspell|initialis|held|moved|neutral|motion|variant|letter|month|number/i)
    }
  })

  it('the configured server model path refuses without making any model request', async () => {
    const fetch = vi.fn(() => { throw new Error('Model must not be called') })
    vi.stubGlobal('fetch', fetch)
    try {
      const result = await handleAssistant({ message: 'how do I sign HELLO' }, 'synthetic-test-key', 'content-safety-test')
      expect(result.status).toBe(200)
      expect(result.body.text).toBe(SIGNING_REFUSAL)
      expect(result.body.learnUrl).toBe('https://suvana.help/learn/?sign=HELLO')
      expect(fetch).not.toHaveBeenCalled()
      expect(SYSTEM_PROMPT).toContain('does not translate into SSL')
      expect(SYSTEM_PROMPT).toContain('category label is not evidence')
    } finally { vi.unstubAllGlobals() }
  })

  it('the offline link index reproduces exactly from Learn reference metadata', () => {
    expect(execFileSync(process.execPath, [fileURLToPath(new URL('../../scripts/build-learn-glosses.mjs', import.meta.url)), '--check'], { encoding: 'utf8' })).toContain('verified')
  })

  it('the homepage spec equals the actual Recognize label count', () => {
    const labels = JSON.parse(readFileSync(new URL('../../../../services/recognition/webapp/data/sinhala_labels.json', import.meta.url), 'utf8'))
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    const count = Object.keys(labels).length
    expect(html).toContain(`${count} Supported Recognize Signs`)
  })
})
