/** Generated union: no inferred names, meanings or cross-module mappings. */
import knowledge from '../../../../services/recognition/webapp/static/suvana-knowledge.json'
export { knowledge }
export interface Sign {
  label: string; names?: string[]; sinhala: string; english: string; category?: string;
  categories?: string[]; units?: Array<{id:string;title:string}>;
  learnGloss?: string | null; learnUrl?: string | null; recognizeLabel?: string | null;
  recognizeCategory?: string; editions?: string[];
}
export interface SignCard {
  label:string; sinhala:string; english:string; category:string; categoryLabel:string;
  tips:string[]; learnUrl:string | null; recognizeLabel:string | null; units:string[];
}
export const CATEGORY_LABEL: Record<string,string> = {letter:'Letter',number:'Number',month:'Month',phrase:'Word / phrase'}
export const GENERAL_TIPS = ['Use front lighting and a plain background.', 'Keep both hands visible for the full capture window.']
export function norm(text:string):string { return (text || '').toLowerCase().replace(/[^a-z0-9඀-෿ ]+/g,' ').trim() }
export function tokens(text:string):string[] { return norm(text).split(' ').filter(Boolean) }
// SequenceMatcher retained for conservative typo suggestions, never a claimed exact match.
export function ratio(a: string, b: string): number {
  const total = a.length + b.length
  if (!total) return 1

  // Index of every position each character occupies in b — the b2j map.
  const b2j = new Map<string, number[]>()
  for (let i = 0; i < b.length; i++) {
    const at = b2j.get(b[i])
    if (at) at.push(i)
    else b2j.set(b[i], [i])
  }

  const longestMatch = (alo: number, ahi: number, blo: number, bhi: number) => {
    let bestI = alo
    let bestJ = blo
    let bestSize = 0
    // j2len[j] = length of the longest match ending at a[i-1], b[j-1].
    let j2len = new Map<number, number>()

    for (let i = alo; i < ahi; i++) {
      const newJ2len = new Map<number, number>()
      for (const j of b2j.get(a[i]) ?? []) {
        if (j < blo) continue
        if (j >= bhi) break
        const k = (j2len.get(j - 1) ?? 0) + 1
        newJ2len.set(j, k)
        if (k > bestSize) {
          bestI = i - k + 1
          bestJ = j - k + 1
          bestSize = k
        }
      }
      j2len = newJ2len
    }
    return [bestI, bestJ, bestSize] as const
  }

  // Total matched characters, via the same divide-and-conquer recursion.
  let matches = 0
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]]
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!
    const [i, j, k] = longestMatch(alo, ahi, blo, bhi)
    if (!k) continue
    matches += k
    if (alo < i && blo < j) queue.push([alo, i, blo, j])
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi])
  }

  return (2 * matches) / total
}

export class SignKnowledgeBase {
  readonly entries: Sign[]
  readonly categories: Record<string,Sign[]> = {}
  constructor(raw:Sign[] = knowledge.signs) {
    this.entries = raw
    for (const entry of raw) {
      const cats = [...(entry.categories ?? []), entry.recognizeCategory ?? entry.category ?? '']
      for (const cat of new Set(cats)) if (cat) (this.categories[cat] ??= []).push(entry)
    }
  }
  get size():number {return this.entries.length}
  exact(query:string):Sign[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const named = this.entries.filter(e => [...(e.names ?? [e.label]),e.sinhala].some(n => n && n.toLowerCase() === q))
    if (named.length) return named
    return this.entries.filter(e => e.english && e.english.toLowerCase() === q)
  }
  search(query:string,limit=6):Sign[] {
    const exact = this.exact(query)
    if (exact.length) return exact.slice(0,limit)
    const q = norm(query)
    if (q.length < 4) return []
    return this.entries.map(e => ({e,score:Math.max(...(e.names ?? [e.label]).filter(n => n.length >= 4).map(n=>ratio(q,norm(n))),0)}))
      .filter(({score})=>score >= 0.82).sort((a,b)=>b.score-a.score || (a.e.label < b.e.label ? -1:1)).slice(0,limit).map(({e})=>e)
  }
  card(entry:Sign):SignCard {
    const category = entry.recognizeCategory ?? entry.category ?? entry.categories?.[0] ?? 'Sign'
    return {label:entry.label,sinhala:entry.sinhala,english:entry.english,category,categoryLabel:CATEGORY_LABEL[category] ?? category,
      tips:[],learnUrl:entry.learnUrl ?? null,recognizeLabel:entry.recognizeLabel ?? null,units:(entry.units ?? []).map(u=>u.title)}
  }
  statsLine():string {return `${this.size} indexed names; Learn ${knowledge.facts.learnCount}; Recognize ${knowledge.facts.recognitionCount}`}
}
export async function loadKnowledgeBase():Promise<SignKnowledgeBase> {return new SignKnowledgeBase()}
