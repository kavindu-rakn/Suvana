import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, test } from 'node:test'

const script = fileURLToPath(new URL('./sync.mjs', import.meta.url))
let temp, source, target
const put = (root, name, body) => { const p = join(root, name); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body) }
function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}
function commit(root) {
  git(root, 'add', '.')
  git(root, '-c', 'user.name=Port test', '-c', 'user.email=port-test@example.invalid', '-c', 'core.hooksPath=', 'commit', '--quiet', '-m', 'Temporary test fixture')
  git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD')
}
function run(...args) {
  return spawnSync(process.execPath, [join(source, 'tools/sync/sync.mjs'), 'port', 'learn', '--to', target, ...args], { encoding: 'utf8' })
}
function digest(root) {
  const hash = createHash('sha256')
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(dir, entry.name)
      hash.update(p)
      if (entry.isDirectory()) visit(p)
      else hash.update(readFileSync(p))
    }
  }
  visit(root)
  return hash.digest('hex')
}
beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), 'suvana-port-test-'))
  source = join(temp, 'source')
  target = join(temp, 'r26-copy')
  for (const root of [source, target]) {
    mkdirSync(root)
    git(root, 'init', '--quiet', '--initial-branch=main')
    git(root, 'config', 'core.autocrlf', 'false')
    git(root, 'config', 'core.quotePath', 'true')
  }
  put(source, 'tools/sync/sync.mjs', readFileSync(script))
  put(source, 'apps/learn/package.json', '{"name":"new"}\n')
  put(source, 'apps/learn/src/old.js', 'new\n')
  put(source, 'apps/learn/src/සිංහල space.txt', 'Unicode path\n')
  put(source, 'apps/learn/public/blob.bin', Buffer.from([0, 255, 1]))
  for (const name of ['suvana.config.json', 'vercel.json', 'package-lock.json', 'AGENTS.md', 'CLAUDE.md']) {
    put(source, `apps/learn/${name}`, 'source excluded\n')
    put(target, `learn-ssl-module/web/${name}`, 'target preserved\n')
  }
  put(source, '.gitignore', 'apps/learn/generated.txt\n')
  put(source, 'apps/learn/generated.txt', 'ignored\n')
  put(target, '.gitignore', 'learn-ssl-module/web/local-cache/**\n')
  put(target, 'learn-ssl-module/web/package.json', '{"name":"old"}\n')
  put(target, 'learn-ssl-module/web/src/old.js', 'old\n')
  put(target, 'learn-ssl-module/web/stale.js', 'delete me\n')
  put(target, 'outside.txt', 'outside boundary\n')
  commit(source)
  commit(target)
  put(target, 'learn-ssl-module/web/local-cache/keep.txt', 'local\n')
})
afterEach(() => {
  assert.equal(dirname(resolve(temp)), resolve(tmpdir()))
  assert.ok(basename(temp).startsWith('suvana-port-test-'))
  rmSync(temp, { recursive: true, force: true })
})

test('--check reports differences and writes nothing, including Git metadata', () => {
  const before = digest(target)
  const sourceBefore = digest(source)
  const r = run('--check')
  assert.equal(r.status, 1, r.stderr)
  assert.match(r.stdout, /2 add \/ 2 modify \/ 1 delete \(check only\)/)
  assert.match(r.stdout, /npm@10 install/)
  assert.equal(digest(target), before)
  assert.equal(digest(source), sourceBefore)
})
test('apply mirrors additions, modifications and deletions; exclusions and ignored assets survive', () => {
  const head = git(target, 'rev-parse', 'HEAD')
  const r = run()
  assert.equal(r.status, 0, r.stderr)
  assert.equal(git(target, 'rev-parse', 'HEAD'), head, 'port must not commit')
  assert.equal(existsSync(join(target, 'learn-ssl-module/web/stale.js')), false)
  assert.equal(existsSync(join(target, 'learn-ssl-module/web/generated.txt')), false)
  assert.equal(readFileSync(join(target, 'learn-ssl-module/web/AGENTS.md'), 'utf8'), 'target preserved\n')
  for (const name of ['suvana.config.json', 'vercel.json', 'package-lock.json', 'CLAUDE.md']) {
    assert.equal(readFileSync(join(target, 'learn-ssl-module/web', name), 'utf8'), 'target preserved\n')
  }
  assert.deepEqual(readFileSync(join(target, 'learn-ssl-module/web/public/blob.bin')), Buffer.from([0, 255, 1]))
  assert.equal(readFileSync(join(target, 'outside.txt'), 'utf8'), 'outside boundary\n')
  assert.equal(readFileSync(join(target, 'learn-ssl-module/web/local-cache/keep.txt'), 'utf8'), 'local\n')
  assert.equal(readFileSync(join(target, 'learn-ssl-module/web/src/සිංහල space.txt'), 'utf8'), 'Unicode path\n')
  commit(target) // Synthetic temporary repo only; never the real R26 tree.
  const before = digest(target)
  assert.equal(run('--check').status, 0)
  assert.equal(digest(target), before)
})
test('refuses dirty, staged and untracked target changes before writing', () => {
  for (const kind of ['unstaged', 'staged', 'untracked']) {
    put(target, kind === 'untracked' ? 'new.txt' : 'outside.txt', kind)
    if (kind === 'staged') git(target, 'add', 'outside.txt')
    const before = digest(target)
    const r = run()
    assert.equal(r.status, 1)
    assert.match(r.stderr, /tree is dirty/)
    assert.equal(digest(target), before)
    git(target, 'reset', '--hard', '--quiet', 'HEAD')
  }
})
test('refuses main that differs from origin/main and a non-main checkout', () => {
  put(target, 'outside.txt', 'local commit\n')
  const original = git(target, 'rev-parse', 'HEAD')
  commit(target)
  git(target, 'update-ref', 'refs/remotes/origin/main', original)
  assert.match(run().stderr, /pull first/)
  git(target, 'update-ref', 'refs/remotes/origin/main', 'HEAD')
  git(target, 'switch', '--quiet', '-c', 'other')
  assert.match(run().stderr, /must be on main/)
})
test('refuses unmerged Learn edits and unknown CLI options', () => {
  put(source, 'apps/learn/src/old.js', 'unmerged\n')
  assert.match(run().stderr, /port only merged Learn milestones/)
  assert.match(run('--bad').stderr, /usage:/)
})
test('ignores CRLF differences and emits no lockfile reminder if package is identical', () => {
  assert.equal(run().status, 0)
  commit(target)
  put(target, 'learn-ssl-module/web/src/old.js', 'new\r\n')
  commit(target)
  const r = run('--check')
  assert.equal(r.status, 0, r.stderr)
  assert.doesNotMatch(r.stdout, /Lockfile reminder/)
})
test('refuses ignored target collisions without partial writes', () => {
  put(target, '.gitignore', 'learn-ssl-module/web/local-cache/**\nlearn-ssl-module/web/public/blob.bin\n')
  commit(target)
  put(target, 'learn-ssl-module/web/public/blob.bin', 'valuable local data')
  const before = digest(target)
  const r = run()
  assert.equal(r.status, 1)
  assert.match(r.stderr, /target collision/)
  assert.equal(digest(target), before)
})
test('refuses directory junctions before mutation', () => {
  mkdirSync(join(temp, 'outside'))
  symlinkSync(join(temp, 'outside'), join(target, 'learn-ssl-module/web/public'), 'junction')
  const r = run()
  assert.equal(r.status, 1)
  assert.match(r.stderr, /symlink\/junction/)
  assert.deepEqual(readdirSync(join(temp, 'outside')), [])
})
