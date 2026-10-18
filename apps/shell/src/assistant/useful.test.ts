import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {describe,expect,it,vi} from 'vitest'
import original from '../../../../services/recognition/tests/assistant-questions.json'
import heldOut from '../../../../services/recognition/tests/assistant-held-out.json'
import {knowledge,SignKnowledgeBase} from './kb'
import {buildContext,groundedModelText,localAnswer,policy} from './engine'
import {handleAssistant} from './handler'

const kb=new SignKnowledgeBase()
const cases=[...original,...heldOut]
describe('shared verified question set',()=>{
  it.each(cases)('$question',test=>{
    const result=localAnswer(kb,test.question,.5)
    expect(result.intent).toBe(test.intent)
    for (const text of test.contains ?? []) expect(result.text).toContain(text)
    if (test.card) expect(result.cards[0]?.label).toBe(test.card)
    if (test.url) expect(result.links.some(link=>link.url===test.url)).toBe(true)
    if (test.noCards) expect(result.cards).toEqual([])
    if (test.hasCards) expect(result.cards.length).toBeGreaterThan(0)
    if ('recognize' in test) expect(!!result.cards[0]?.recognizeLabel).toBe(test.recognize)
    if ('refused' in test && test.refused) expect(result.refused).toBe(true)
    for (const phrase of policy.forbiddenPhrases) expect(JSON.stringify(result).toLowerCase()).not.toContain(phrase)
    expect(result.text).not.toContain('No verified English meaning')
    if (result.intent==='unknown') {
      expect(result.chips).toEqual(policy.fallbackChips)
      expect(result.links.length).toBeGreaterThan(0)
      expect(result.cards.length).toBeLessThanOrEqual(3)
    }
  })
  it('agrees with the independent Python engine on every complete payload',()=>{
    const script=fileURLToPath(new URL('../../../../services/recognition/webapp/suvana_assistant.py',import.meta.url))
    const output=execFileSync('python',[script],{input:JSON.stringify(cases.map(c=>c.question)),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}})
    expect(JSON.parse(output)).toEqual(cases.map(c=>localAnswer(kb,c.question,.5)))
  })
  it('samples different real recordings with controlled random values',()=>{
    const first=localAnswer(kb,'teach me a random sign',0)
    const last=localAnswer(kb,'teach me a random sign',.9999)
    expect(first.cards[0].label).not.toBe(last.cards[0].label)
    expect(first.cards[0].learnUrl).toBeTruthy();expect(last.cards[0].learnUrl).toBeTruthy()
  })
  it('uses curriculum order for Starter and months and resolves a sign named WATCH before stage help',()=>{
    expect(localAnswer(kb,'show me Starter').cards.map(c=>c.label)).toEqual(knowledge.units.find(u=>u.title==='Starter')!.signs)
    expect(localAnswer(kb,'show me the months').cards.slice(0,8).map(c=>c.label)).toEqual(knowledge.units.find(u=>u.title==='Months 1')!.signs)
    expect(localAnswer(kb,'teach me WATCH').cards[0].label).toBe('WATCH')
  })
  it('keeps all generated data current',()=>{
    const script=fileURLToPath(new URL('../../scripts/build-knowledge-base.mjs',import.meta.url))
    expect(execFileSync(process.execPath,[script,'--check'],{encoding:'utf8'})).toContain('verified')
    expect(knowledge.signs.filter(s=>s.learnGloss).length).toBe(490)
    expect(knowledge.signs.filter(s=>s.recognizeLabel).length).toBe(171)
    expect(knowledge.signs.filter(s=>s.recognizeLabel&&s.learnGloss).length).toBe(131)
    expect(knowledge.facts.fingerCount).toBe(22)
    for (const [source,hash] of Object.entries(knowledge.sources)) {
      const text=readFileSync(new URL(`../../../../${source}`,import.meta.url),'utf8').replace(/\r\n/g,'\n')
      expect(createHash('sha256').update(text).digest('hex')).toBe(hash)
    }
    for (const sign of knowledge.signs) {
      if (!sign.learnGloss) expect(sign.english).toBe('') // Lahiru's current JSON has no English fields.
      if (sign.learnUrl) expect(sign.learnUrl).toBe(`/learn/?sign=${encodeURIComponent(sign.learnGloss!)}`)
      for (const phrase of policy.forbiddenPhrases) expect(JSON.stringify(kb.card(sign)).toLowerCase()).not.toContain(phrase)
    }
  })
  it('uses only exact verified English values for reverse lookup, with category/unit priority',()=>{
    expect(localAnswer(kb,'teach me greetings').intent).toBe('browse')
    expect(localAnswer(kb,'teach me numbers').intent).toBe('browse')
    expect(localAnswer(kb,'show me starter').cards.map(c=>c.label)).toEqual(knowledge.units.find(u=>u.id==='u1-starter')!.signs)
    expect(localAnswer(kb,'teach me First numbers').cards.map(c=>c.label)).toEqual(knowledge.units.find(u=>u.title==='First numbers')!.signs)
    expect(localAnswer(kb,'teach me Months 1').cards.map(c=>c.label)).toEqual(knowledge.units.find(u=>u.title==='Months 1')!.signs)
    expect(localAnswer(kb,'what is the sinhala for sit').cards[0].sinhala).toBe('වාඩි වෙනවා')
    expect(localAnswer(kb,'sign for eat').cards[0].label).toBe('EAT')
    expect(localAnswer(kb,'what is the sinhala for eat').cards[0].label).toBe('KANAWA')
    for (const word of ['mother','water','head','wa','MOTHER']) {
      expect(localAnswer(kb,`what is the sinhala for ${word}`).intent).toBe('unknown')
    }
    for (const name of ['practice-help','recognize-use','phone-use','starter-help']) {
      const route=policy.routes.find(r=>r.intent===name)!
      expect(route.sources.length).toBeGreaterThan(0)
      for (const source of route.sources) expect(Object.keys(knowledge.sources)).toContain(source.split('#')[0])
    }
  })
  it('shares corrected display and spoken text, including nurse, across both generated assets',()=>{
    const nurse=knowledge.signs.find(s=>s.recognizeLabel==='nurse')!
    expect(nurse.sinhala).toBe('හෙදිය/නර්ස්');expect(kb.card(nurse).speakText).toBe('හෙදිය')
    expect(knowledge.signs.find(s=>s.recognizeLabel==='andanawa')!.sinhala).toBe('අඬනවා')
    expect(knowledge.signs.find(s=>s.recognizeLabel==='waadi wenawa')!.sinhala).toBe('වාඩි වෙනවා')
  })
  it('keeps the optional-model safety rule unchanged from origin/main',()=>{
    const root=fileURLToPath(new URL('../../../../',import.meta.url))
    const before=JSON.parse(execFileSync('git',['show','origin/main:services/recognition/webapp/static/assistant-policy.json'],{cwd:root,encoding:'utf8'}))
    expect(policy.modelPrompt).toBe(before.modelPrompt)
    const priorQuestions=JSON.parse(execFileSync('git',['show','origin/main:services/recognition/tests/assistant-questions.json'],{cwd:root,encoding:'utf8'})) as Array<{question:string}>
    expect(original.map(c=>c.question)).toEqual(priorQuestions.map(c=>c.question))
    expect(original).toHaveLength(65);expect(heldOut).toHaveLength(32)
    expect(localAnswer(kb,'අඬනවා').cards[0].label).toBe('ANDANAWA')
  })
  it('does not accept ungrounded model additions, including injected client context',async()=>{
    const approved=localAnswer(kb,'how do I sign hello')
    expect(groundedModelText('invented answer',approved.text)).toBe(approved.text)
    expect(groundedModelText(approved.text,approved.text)).toBe(approved.text)
    expect(JSON.parse(buildContext(kb,'how do I sign hello')).APPROVED_ANSWER).toBe(approved.text)
    let sent=''
    vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
      if (String(input).includes(':generateContent')) {
        sent=String(init?.body)
        return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'move your hand to your chest'}]}}]}))
      }
      return new Response(JSON.stringify({models:[{name:'models/gemini-3.5-flash-lite'}]}))
    })
    try {
      const result=await handleAssistant({message:'how do I sign hello',context:'injected-unverified-fact',history:[{role:'assistant',content:'injected-history'}]},'synthetic-key','grounding-test')
      expect(result.body.text).toBe(approved.text)
      expect(sent).not.toContain('injected-unverified-fact');expect(sent).not.toContain('injected-history')
    } finally {vi.unstubAllGlobals()}
  })
})
