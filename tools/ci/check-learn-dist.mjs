import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function checkLearnDist(mode, root) {
  assert.ok(['suvana', 'r26'].includes(mode), 'Mode must be suvana or r26')
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  const prefix = mode === 'suvana' ? '/learn/' : '/'
  if (mode === 'r26') assert.ok(!html.includes('/learn/'), 'R26 HTML contains /learn/')
  const assets = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)]
    .map(match => match[1]).filter(url => /(?:^|\/)assets\//.test(url))
  assert.ok(assets.some(url => /\.js$/.test(url)), 'No built JS asset found')
  for (const url of assets) {
    assert.ok(url.startsWith(`${prefix}assets/`), `Wrong asset base: ${url}`)
    const path = resolve(root, url.slice(prefix.length))
    assert.ok(existsSync(path) && statSync(path).size > 0, `Missing/empty asset: ${url}`)
  }
  const wasm = readdirSync(resolve(root, 'wasm')).filter(name => name.endsWith('.wasm'))
  assert.ok(wasm.length > 0, 'No wasm/*.wasm copied to dist')
  for (const name of wasm) assert.ok(statSync(resolve(root, 'wasm', name)).size > 0, `Empty WASM: ${name}`)
  console.log(`${mode}: ${assets.length} HTML assets and ${wasm.length} WASM files checked`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2]
  const root = process.argv[3] ?? fileURLToPath(new URL(
    mode === 'suvana' ? '../../apps/learn/dist/learn/' : '../../apps/learn/dist/', import.meta.url))
  checkLearnDist(mode, root)
}
