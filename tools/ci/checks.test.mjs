import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { brandViolations } from './check-brands.mjs'
import { checkLearnDist } from './check-learn-dist.mjs'

test('brand check rejects visible copy across all four module roots', () => {
  for (const [file, source] of [
    ['apps/shell/index.html', '<h1>SoundGuard</h1>'],
    ['apps/shell/public/logo.svg', '<svg><text>SoundGuard</text></svg>'],
    ['apps/alerts/app/index.tsx', '<Text>SignSpeak</Text>'],
    ['apps/communicate/app/page.tsx', 'const title = "Sawana"'],
    ['services/recognition/webapp/static/index.html', '<title>sOuNdGuArD</title>'],
    ['apps/alerts/plugins/withSoundGuardBackground.js', 'const java = `builder.setContentTitle("SoundGuard is listening");`'],
    ['apps/alerts/plugins/withSoundGuardBackground.js', 'const java = `builder.setContentTitle("https://example.test/ SoundGuard");`'],
  ]) assert.equal(brandViolations(file, source).length, 1, file)
})

test('brand check keeps internal exceptions narrow, including on mixed lines', () => {
  const file = 'apps/communicate/app/contribute/ContributeClient.tsx'
  const key = 'const key = "signspeak.contribute.speakerKey";'
  assert.deepEqual(brandViolations(file, key), [])
  assert.equal(brandViolations(file, key + ' const title = "SignSpeak";').length, 1)
  assert.equal(brandViolations('apps/alerts/app/index.tsx', 'const x = "SoundGuard is listening";').length, 1)
  assert.equal(brandViolations('apps/alerts/app/index.tsx', '<Text>soundguard</Text>').length, 1)
  assert.equal(brandViolations('apps/alerts/app/onboarding.tsx', 'const title = "soundguard";').length, 1)
  assert.equal(brandViolations('services/recognition/webapp/static/soundguard.js',
    'const path = "/api/soundguard/info"; const title = "SoundGuard";').length, 1)
})

test('brand check ignores comments, variable names and unrelated corpus labels', () => {
  assert.deepEqual(brandViolations('apps/alerts/app/index.tsx',
    '/* SoundGuard */ const switchToSoundGuard = () => "Suvana"; // SignSpeak'), [])
  assert.deepEqual(brandViolations('apps/shell/public/data/signs.json', '["osawanawa"]'), [])
  assert.equal(brandViolations('apps/alerts/app/index.tsx',
    'const soundguardChips = "Sawana";').length, 1)
})

test('brand check inspects interpolated templates and JSX attributes', () => {
  assert.equal(brandViolations('apps/shell/src/main.ts', 'const x = `Hi ${user} SignSpeak`;').length, 1)
  assert.equal(brandViolations('apps/alerts/app/index.tsx', '<Button title="Sawana" />').length, 1)
})

function fixture(mode, run) {
  const root = mkdtempSync(join(tmpdir(), 'suvana-ci-dist-'))
  const prefix = mode === 'suvana' ? '/learn/' : '/'
  mkdirSync(join(root, 'assets'))
  mkdirSync(join(root, 'wasm'))
  writeFileSync(join(root, 'assets', 'main.js'), 'export {}')
  writeFileSync(join(root, 'wasm', 'vision.wasm'), 'fixture')
  writeFileSync(join(root, 'index.html'), `<script src="${prefix}assets/main.js"></script>`)
  try { run(root) } finally {
    assert.ok(root.startsWith(join(tmpdir(), 'suvana-ci-dist-')), 'Unexpected fixture cleanup path')
    rmSync(root, { recursive: true, force: true })
  }
}

test('dist check accepts both forms and rejects the opposite asset base', () => {
  for (const mode of ['suvana', 'r26']) fixture(mode, root => {
    checkLearnDist(mode, root)
    assert.throws(() => checkLearnDist(mode === 'suvana' ? 'r26' : 'suvana', root))
  })
})

test('dist check rejects missing JS and absent/empty WASM', () => {
  fixture('suvana', root => {
    rmSync(join(root, 'assets', 'main.js'))
    assert.throws(() => checkLearnDist('suvana', root), /Missing\/empty asset/)
  })
  fixture('suvana', root => {
    rmSync(join(root, 'wasm', 'vision.wasm'))
    assert.throws(() => checkLearnDist('suvana', root), /No wasm/)
  })
  fixture('r26', root => {
    writeFileSync(join(root, 'wasm', 'vision.wasm'), '')
    assert.throws(() => checkLearnDist('r26', root), /Empty WASM/)
    writeFileSync(join(root, 'index.html'), '<p>/learn/references/</p><script src="/assets/main.js"></script>')
    assert.throws(() => checkLearnDist('r26', root), /R26 HTML/)
  })
})
