import {describe,expect,it,vi} from 'vitest'
import {GENERAL_TIPS,SignKnowledgeBase} from './kb'
import {signingRefusal} from './signingSafety'
import {handleAssistant} from './handler'
import {SYSTEM_PROMPT} from './model'
describe('signing safety while offering useful practice',()=>{
  it('offers recordings for teaching; declines form and translation before a model call',async()=>{
    expect(signingRefusal('how do I sign hello')).toBeNull()
    const fetch=vi.fn(()=>{throw new Error('must not call model')});vi.stubGlobal('fetch',fetch)
    try {
      for (const message of ['describe the handshape for A','translate my name is Daham to SSL']) {
        const result=await handleAssistant({message},'synthetic-key',message)
        expect(result.status).toBe(200);expect(result.body.refused).toBe(true)
      }
      expect(fetch).not.toHaveBeenCalled()
      expect(SYSTEM_PROMPT).toContain('Never translate into SSL')
      expect(SYSTEM_PROMPT).toContain('APPROVED_ANSWER')
    } finally {vi.unstubAllGlobals()}
  })
  it('cards contain no repeated tips; remaining tips describe camera setup only',()=>{
    for (const sign of new SignKnowledgeBase().entries) expect(new SignKnowledgeBase().card(sign).tips).toEqual([])
    expect(GENERAL_TIPS.join(' ')).not.toMatch(/handshape|palm|chest|pose|fingerspell|initialis|held|moved|neutral|motion|variant/i)
  })
})
