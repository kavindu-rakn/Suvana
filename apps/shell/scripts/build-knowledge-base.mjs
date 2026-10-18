// Read-only source extraction. No label, reference, model or curriculum is rewritten.
import { build } from '../node_modules/esbuild/lib/main.js'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../../../', import.meta.url)
const sources = {}
function read(path) {
  const text = readFileSync(new URL(path, root), 'utf8')
  sources[path] = createHash('sha256').update(text).digest('hex')
  return text
}
const sourcePaths = {
  index: 'apps/learn/public/reference-index.json',
  translations: 'apps/learn/src/data/translations.ts',
  curriculum: 'apps/learn/src/data/curriculum.ts',
  selector: 'apps/learn/src/storage/references.ts',
  sentences: 'apps/learn/src/data/sentences.ts',
  cutoffs: 'apps/learn/src/scoring/fingerCutoffs.ts',
  rules: 'apps/learn/src/learner/game.ts',
  labels: 'services/recognition/webapp/data/sinhala_labels.json',
}
for (const path of Object.values(sourcePaths)) read(path)
const imports = [
  ['translations', 'GLOSS_TRANSLATIONS'], ['curriculum', 'CURRICULUM_UNITS'],
  ['selector', 'pickReferenceList'], ['cutoffs', 'SIGN_FINGER_CUTOFFS'],
  ['rules', 'TRY_FIRST_STAR, TRY_SECOND_STAR, RECALL_THIRD_STAR, DAILY_GOAL, UNIT_PASS_STARS'],
]
const bundle = await build({ stdin: {
  contents: imports.map(([key,names]) => `export {${names}} from './${sourcePaths[key]}'`).join('\n'),
  resolveDir: fileURLToPath(root), loader: 'ts',
}, bundle: true, platform: 'node', format: 'esm', write: false })
const data = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const index = JSON.parse(read(sourcePaths.index))
const labels = JSON.parse(read(sourcePaths.labels))
const picked = data.pickReferenceList(index.recordings)
const signs = new Map()
for (const ref of picked) {
  const units = data.CURRICULUM_UNITS.filter(unit => unit.signs.includes(ref.gloss))
  signs.set(ref.gloss.toLowerCase(), {
    label: ref.gloss, names: [ref.gloss], sinhala: '', english: data.GLOSS_TRANSLATIONS[ref.gloss] ?? '',
    learnGloss: ref.gloss, learnUrl: `/learn/?sign=${encodeURIComponent(ref.gloss)}`,
    recognizeLabel: null, recognizeEnglish: null,
    categories: [...new Set(units.map(unit => unit.sourceCategory).filter(Boolean))],
    units: units.map(({id,title}) => ({id,title})),
    editions: [...new Set(index.recordings.filter(rec => rec.gloss === ref.gloss && rec.sourceCategory !== 'SSL Sentences').map(rec => index.sources[rec.source]?.licence).filter(Boolean))],
    provenance: { learn: sourcePaths.index, meaning: data.GLOSS_TRANSLATIONS[ref.gloss] ? sourcePaths.translations : null, curriculum: sourcePaths.curriculum },
  })
}
for (const [label, meta] of Object.entries(labels)) {
  const key = label.toLowerCase()
  const sign = signs.get(key) ?? {label, names:[label], sinhala:'', english:meta.english ?? '', learnGloss:null, learnUrl:null, recognizeLabel:null, recognizeEnglish:null, categories:[], units:[], editions:[], provenance:{}}
  if (!sign.names.includes(label)) sign.names.push(label)
  sign.sinhala = meta.sinhala ?? ''
  sign.recognizeLabel = label
  sign.recognizeEnglish = meta.english ?? null
  sign.recognizeCategory = meta.category
  sign.provenance.recognize = sourcePaths.labels
  if (!sign.english && meta.english) sign.english = meta.english
  if (!sign.provenance.meaning && meta.english) sign.provenance.meaning = sourcePaths.labels
  signs.set(key, sign)
}
const configPath = 'services/recognition/config/config.yaml'
const config = read(configPath)
const frames = Number(/frames_per_sequence:\s*(\d+)/.exec(config)?.[1])
const confidence = Number(/confidence_threshold:\s*([\d.]+)/.exec(config)?.[1])
if (!frames || !confidence) throw new Error('Recognition capture facts missing')
const fingerSigns = picked.filter(ref => data.SIGN_FINGER_CUTOFFS[ref.id]).map(ref => ref.gloss)
if (fingerSigns.length !== 22) throw new Error(`Finger coverage changed (${fingerSigns.length}); review the assistant claim`)
// These are product controls and published rules, never descriptions of a sign.
for (const path of ['apps/learn/src/components/ProgressView.tsx', 'apps/learn/src/components/PathView.tsx', 'apps/learn/src/learner/pathContent.ts', 'apps/learn/src/components/practiceStages.ts', 'apps/learn/src/components/SkeletonPlayer.tsx', 'apps/learn/src/components/PracticeView.tsx', 'apps/shell/privacy.html', 'apps/shell/alerts/index.html', 'services/recognition/webapp/server.py', 'README.md']) read(path)
const facts = {
  recognitionCount: Object.keys(labels).length, learnCount: picked.length,
  frames, confidencePercent: confidence * 100, fingerCount: fingerSigns.length, fingerSigns,
  firstStar: data.TRY_FIRST_STAR, secondStar: data.TRY_SECOND_STAR, recallStar: data.RECALL_THIRD_STAR,
  dailyGoal: data.DAILY_GOAL, unitPassStars: data.UNIT_PASS_STARS,
}
const output = {generator:'apps/shell/scripts/build-knowledge-base.mjs', mergeRule:'Names equal ignoring case only; no inferred mapping or translation. Missing English stays unknown.', sources, facts,
  units:data.CURRICULUM_UNITS.map(({id,title,sourceCategory,signs})=>({id,title,sourceCategory,signs})),
  signs:[...signs.values()].sort((a,b)=>a.label < b.label ? -1 : a.label > b.label ? 1 : 0)}
const text = JSON.stringify(output, null, 2) + '\n'
const target = new URL('services/recognition/webapp/static/suvana-knowledge.json', root)
// The homepage stat still reads this 171-label compatibility asset. Retire its
// old, unverified assistant-authored English map without changing that count.
const compatibility = JSON.stringify({
  _generator: output.generator, _source: sourcePaths.labels, sources,
  signs: Object.entries(labels).map(([label,meta]) => ({label,sinhala:meta.sinhala ?? '',category:meta.category,english:signs.get(label.toLowerCase()).english})),
}) + '\n'
for (const [file, content] of [[target,text], [new URL('apps/shell/public/data/signs.json',root),compatibility]]) {
  if (process.argv.includes('--check')) {
    if (readFileSync(file,'utf8') !== content) throw new Error('Knowledge base stale: node apps/shell/scripts/build-knowledge-base.mjs')
  } else writeFileSync(file,content)
}
console.log(`Knowledge base: ${output.signs.length} records; Learn ${facts.learnCount}; Recognize ${facts.recognitionCount}; finger labels ${facts.fingerCount}${process.argv.includes('--check')?' verified':' written'}`)
