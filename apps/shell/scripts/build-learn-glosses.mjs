import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

// Metadata only, read in place. Never rewrite a reference or infer a gloss.
const root = new URL('../../../', import.meta.url)
const references = new URL('apps/learn/public/references/', root)
const { files } = JSON.parse(readFileSync(new URL('manifest.json', references), 'utf8'))
const metadata = files.map(file => {
  const { id, gloss, sourceCategory } = JSON.parse(readFileSync(new URL(file, references), 'utf8'))
  return { file, id, gloss, sourceCategory }
})
const glosses = [...new Set(metadata.filter(rec =>
  rec.sourceCategory !== 'SSL Sentences' && !rec.file.startsWith('kaggle_sent_') && !rec.id.startsWith('kaggle_sent_'),
).map(rec => rec.gloss))].sort()
const content = JSON.stringify({
  source: 'apps/learn/public/references/manifest.json and its single-sign reference metadata',
  generator: 'apps/shell/scripts/build-learn-glosses.mjs',
  metadataSha256: createHash('sha256').update(JSON.stringify(metadata)).digest('hex'),
  glosses,
}, null, 2) + '\n'
const output = new URL('services/recognition/webapp/static/learn-glosses.json', root)
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== content) throw new Error('Learn gloss index is stale; run node apps/shell/scripts/build-learn-glosses.mjs')
} else writeFileSync(output, content)
console.log(`Learn link index: ${glosses.length} exact single-sign glosses${process.argv.includes('--check') ? ' verified' : ' written'}`)
