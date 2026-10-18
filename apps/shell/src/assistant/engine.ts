/** Intent before retrieval; shares source data and answer policy with Python. */
import policy from '../../../../services/recognition/webapp/static/assistant-policy.json'
import { knowledge, SignKnowledgeBase } from './kb'
import type { Sign, SignCard } from './kb'
export { policy }
export interface Answer {
  intent: string; text: string; cards: SignCard[]; chips: string[];
  links: Array<{label:string;url:string}>; refused?: boolean;
  via?: 'gemini'; notice?: string; learnUrl?: string;
}
function fill(template:string, values:Record<string,unknown> = {}):string {
  const all:Record<string,unknown> = {...knowledge.facts,...values}
  return template.replace(/\{(\w+)\}/g,(_,key)=>String(all[key] ?? ''))
}
function clean(value:string):string {
  return value.trim().replace(/[?.!]+$/g,'').replace(/^["'“‘]|["'”’]$/g,'').trim()
}
export function stripQuery(message:string):string {
  let q = clean(message)
  const teach = new RegExp(policy.teachPattern,'i').exec(q)
  if (teach) q = clean(teach[1])
  else for (const pattern of policy.lookupPatterns) {
    const hit = new RegExp(pattern,'i').exec(q)
    if (hit) {q=clean(hit[1]);break}
  }
  for (const prefix of policy.stopTargets) if (q.toLowerCase().startsWith(prefix)) q=q.slice(prefix.length)
  return clean(q)
}
function answer(intent:string,text:string,cards:SignCard[]=[],url?:string,label='Browse Learn'):Answer {
  return {intent,text,cards,chips:policy.chips,links:url?[{label,url}]:[]}
}
function support(sign:Sign):string {return sign.recognizeLabel ? policy.recognizeYes : policy.recognizeNo}
function signAnswer(kb:SignKnowledgeBase, sign:Sign, teaching:boolean):Answer {
  const meaning = sign.english ? fill(policy.meaning,{english:sign.english}) : policy.meaningUnknown
  const text = teaching
    ? (sign.learnUrl ? fill(policy.teach,{label:sign.label}) + '\n\n' + support(sign) : fill(policy.recognizeOnly,{label:sign.label}))
    : `**${sign.label}**${sign.sinhala ? ` · ${sign.sinhala}`:''}\n\n${meaning}\n\n${sign.learnUrl ? 'Learn has an exact-name reference recording. ' : 'No exact-name single-sign recording in Learn. '}${support(sign)}`
  return answer(teaching?'teach':'lookup',text,[kb.card(sign)],sign.learnUrl ?? '/learn/',sign.learnUrl?'Watch this sign in Learn':'Browse Learn')
}
export function localAnswer(kb:SignKnowledgeBase,message:string,randomValue=Math.random()):Answer {
  const msg = clean(message || '')
  const target = stripQuery(msg)
  const signRequest = new RegExp(policy.teachPattern,'i').test(msg) || policy.lookupPatterns.some(pattern=>new RegExp(pattern,'i').test(msg))
  const explicitSign = signRequest && kb.exact(target).length>0 && !/\bsign\s+in\b/i.test(msg)
  for (const route of policy.routes) if (new RegExp(route.pattern,'i').test(msg)) {
    if (explicitSign && !['translation','form','outside','camera','low-score','recognition-help'].includes(route.intent)) continue
    const result = answer(route.intent,fill(route.text),[],route.url,route.action)
    if ('refused' in route && route.refused) result.refused=true
    if (route.intent==='form') {
      const target = /(?:for|of)\s+(.+)$/i.exec(msg)?.[1]
      const named = target ? kb.exact(clean(target)).find(s=>s.learnGloss?.toLowerCase()===clean(target).toLowerCase()) : undefined
      if (named?.learnUrl) result.links=[{label:'Watch this sign in Learn',url:named.learnUrl}]
    }
    return result
  }
  if (!kb.size) return answer('unavailable','The sign index is unavailable. Reload the page to try again.')
  if (/\bhow many\b|\btotal signs\b|\bsign count\b/i.test(msg)) return answer('count',`${knowledge.facts.learnCount} Learn glosses and ${knowledge.facts.recognitionCount} Recognize labels form ${knowledge.signs.length} exact-name records. Shared names do not prove that both modules use the same recording.`,[],'/learn/')
  if (/\b(random|surprise me|another one|another sign)\b/i.test(msg)) {
    const pool=kb.entries.filter(s=>s.learnUrl)
    if (!pool.length) return answer('unknown',policy.unknown,[],'/learn/')
    return {...signAnswer(kb,pool[Math.min(pool.length-1,Math.max(0,Math.floor(randomValue*pool.length)))],true),intent:'random'}
  }
  for (const category of policy.categories) if (new RegExp(category.pattern,'i').test(msg) && /^(show|list|browse|what|which|all|months?|letters?|numbers?|මාස|අකුරු|ඉලක්කම්)/i.test(msg)) {
    const related=knowledge.units.filter(unit=>category.sourceCategories.includes(unit.sourceCategory ?? ''))
    const ordered=related.flatMap(unit=>unit.signs).map(gloss=>kb.entries.find(s=>s.learnGloss===gloss)).filter((s):s is Sign=>!!s)
    const extra=kb.entries.filter(s=>s.recognizeCategory===category.key && !ordered.includes(s))
    const items=[...new Set([...ordered,...extra])]
    const page=Math.max(1,Number(/\bpage\s+(\d+)/i.exec(msg)?.[1] ?? (/\b(more|next)\b/i.test(msg)?2:1)))
    const preview=items.slice((page-1)*12,page*12)
    const detail=!preview.length ? 'No more names on this page. ' : items.length>12 ? `${page>1?'Next':'First'} ${preview.length} shown (page ${page}). `:''
    const result=answer('browse',`${items.length} indexed names in ${category.title}. ${detail}Spellings follow the source; membership and verified meanings are on each card.`,preview.map(s=>kb.card(s)), '/learn/')
    result.chips=[`Show ${category.title} page ${page*12<items.length?page+1:1}`,'Teach me a random sign']
    return result
  }
  const q=stripQuery(msg)
  const unit = knowledge.units.find(u=>u.title.toLowerCase()===q.toLowerCase())
  if (unit && /^(show|list|browse)/i.test(msg)) {
    const signs=unit.signs.map(gloss=>kb.entries.find(s=>s.learnGloss===gloss)).filter((s):s is Sign=>!!s)
    return answer('browse',`Learn unit: ${unit.title}. These names follow the approved curriculum.`,signs.map(s=>kb.card(s)),'/learn/')
  }
  const teaching=new RegExp(policy.teachPattern,'i').test(msg) || /(සංඥා|භාෂා).*(කොහොම|කෙසේ|පෙන්ව)/u.test(msg)
  const hits=kb.exact(q)
  if (hits.length) {
    if (hits.length===1) return signAnswer(kb,hits[0],teaching)
    return answer('lookup','More than one listed name has that verified meaning; choose a card.',hits.map(s=>kb.card(s)), '/learn/')
  }
  if (!msg || /^(hi|hey|hello|thanks|thank you|help)$/i.test(msg)) return answer('help',policy.greeting,[],'/learn/')
  const suggestions=kb.search(q,3)
  return answer('unknown',`${policy.unknown} ${suggestions.length ? policy.suggestions:policy.unknownAction}`,suggestions.map(s=>kb.card(s)), '/learn/')
}
export function buildContext(kb:SignKnowledgeBase,message:string):string {
  const approved=localAnswer(kb,message)
  return JSON.stringify({facts:knowledge.facts, records:approved.cards, APPROVED_ANSWER:approved.text})
}
export function groundedModelText(candidate:string, approved:string):string {
  return candidate.trim()===approved ? candidate.trim():approved
}
