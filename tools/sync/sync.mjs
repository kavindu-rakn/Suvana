#!/usr/bin/env node
/**
 * Keeps Suvana's components in step with the repos they were copied from.
 *
 * Suvana is a fresh-history monorepo: each component is a working-tree copy
 * of a folder in a team member's repo, plus a few deliberate Suvana-specific
 * changes ("couplings"). This script reads tools/sync/upstreams.json, which
 * records for every component where it came from, which upstream commit it
 * last matched, and which files are allowed to differ — then:
 *
 *   status [id...]    fetch upstream, list new commits, classify every changed
 *                     file (take / merge / skip), dry-run the three-way merges,
 *                     and report Suvana-side edits the manifest does not declare
 *   apply <id>        do it: copy "take" files, three-way merge "merge" files
 *                     (conflict markers left in place), leave "skip" files alone
 *   record <id> [rev] after the gates pass, set the component's synced commit —
 *                     refused unless Suvana matches that commit apart from what
 *                     the manifest declares
 *   guard             offline; asserts the couplings are still present. CI runs
 *                     this, so a careless copy fails the build, not production
 *
 * Upstreams are read from a blobless bare clone in tools/sync/.cache/ (git-
 * ignored; blobs download on demand). To use a clone you already have instead,
 * set SYNC_LOCAL_<UPSTREAM> — e.g. SYNC_LOCAL_R26=../R26-SE-019 — and its
 * origin/<branch> is what gets compared, never unpushed local commits.
 *
 * Comparison ignores CRLF vs LF, since Windows checkouts convert on the way
 * out and git normalises on the way back in.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..')
const MANIFEST_PATH = join(HERE, 'upstreams.json')
const CACHE = join(HERE, '.cache')

// ---------------------------------------------------------------- utilities

function git(cwd, args, { buffer = false, allowFail = false } = {}) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: buffer ? 'buffer' : 'utf8',
    maxBuffer: 512 * 1024 * 1024,
  })
  if (r.error) throw r.error
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')} (in ${cwd}) failed:\n${r.stderr}`)
  }
  return r
}

/** `**` crosses folders, `*` and `?` do not. Patterns are relative paths. */
function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*'
      i++
      if (glob[i + 1] === '/') i++
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

function matchRule(rules, path) {
  for (const [pattern, why] of Object.entries(rules ?? {})) {
    if (globToRegExp(pattern).test(path)) return { pattern, why }
  }
  return null
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0)
const normalise = (buf) => (isBinary(buf) ? buf : Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n')))
const same = (a, b) => a !== null && b !== null && normalise(a).equals(normalise(b))
const short = (rev) => rev.slice(0, 7)

function readSuvana(path) {
  const abs = join(ROOT, path)
  return existsSync(abs) ? readFileSync(abs) : null
}

function writeSuvana(path, buf) {
  const abs = join(ROOT, path)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, buf)
}

const manifest = () => JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))

function component(m, id) {
  const c = m.components.find((x) => x.id === id)
  if (!c) throw new Error(`No component "${id}". Known: ${m.components.map((x) => x.id).join(', ')}`)
  return c
}

// ---------------------------------------------------------------- upstreams

const opened = new Map()

/** A git dir holding the upstream, and the ref that means "its published head". */
function openUpstream(m, name) {
  if (opened.has(name)) return opened.get(name)
  const spec = m.upstreams[name]
  if (!spec) throw new Error(`Manifest names an unknown upstream "${name}"`)
  const envKey = `SYNC_LOCAL_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
  let repo
  if (process.env[envKey]) {
    const dir = resolve(process.env[envKey])
    git(dir, ['fetch', '--quiet', 'origin'])
    repo = { dir, ref: `origin/${spec.branch}` }
  } else {
    const dir = join(CACHE, name)
    if (!existsSync(join(dir, 'HEAD'))) {
      mkdirSync(CACHE, { recursive: true })
      console.error(`Cloning ${spec.url} (blobless) into tools/sync/.cache/${name} ...`)
      git(CACHE, ['clone', '--quiet', '--bare', '--filter=blob:none', '--single-branch', '--branch', spec.branch, spec.url, name])
    } else {
      git(dir, ['fetch', '--quiet', 'origin', `+refs/heads/${spec.branch}:refs/heads/${spec.branch}`])
    }
    repo = { dir, ref: spec.branch }
  }
  repo.head = git(repo.dir, ['rev-parse', repo.ref]).stdout.trim()
  opened.set(name, repo)
  return repo
}

function upstreamFile(repo, rev, path) {
  const r = git(repo.dir, ['show', `${rev}:${path}`], { buffer: true, allowFail: true })
  return r.status === 0 ? r.stdout : null
}

/** A component's upstream folder as a pathspec and a prefix; '' means the repo root. */
const scope = (from) => ({ spec: from ? `${from}/` : '.', prefix: from ? `${from}/` : '' })

/** path → blob id, for every file under the component's folder at `rev`. */
function upstreamTree(repo, rev, from) {
  const { spec, prefix } = scope(from)
  const out = git(repo.dir, ['ls-tree', '-r', rev, '--', spec]).stdout
  const tree = new Map()
  for (const line of out.split('\n').filter(Boolean)) {
    const [meta, path] = line.split('\t')
    tree.set(path.slice(prefix.length), meta.split(' ')[2])
  }
  return tree
}

/** The id git would give `buf` as a blob, after CRLF normalisation — no subprocess. */
const blobId = (buf) => {
  const body = normalise(buf)
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex')
}

function suvanaTree(to) {
  const out = git(ROOT, ['ls-files', '--cached', '--others', '--exclude-standard', '--', `${to}/`]).stdout
  return out.split('\n').filter(Boolean).map((p) => p.slice(to.length + 1))
}

// ---------------------------------------------------------------- analysis

/**
 * Everything a sync of one component needs to know: the new upstream commits,
 * what to do with each changed file, and where Suvana differs from upstream
 * without the manifest saying so.
 */
function analyse(m, c, target) {
  const repo = openUpstream(m, c.upstream)
  const to = target ?? repo.head
  const from = c.from
  const { spec, prefix } = scope(from)
  const up = (rev, p) => upstreamFile(repo, rev, `${prefix}${p}`)
  const declared = (p) =>
    matchRule(c.couplings, p) ?? matchRule(c.suvanaOnly, p) ?? matchRule(c.skip, p)

  const commits = git(repo.dir, ['log', '--date=short', '--format=%h\t%ad\t%an\t%s', `${c.synced}..${to}`, '--', spec])
    .stdout.split('\n')
    .filter(Boolean)

  const changed = git(repo.dir, ['diff', '--name-status', '--no-renames', c.synced, to, '--', spec])
    .stdout.split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, path] = line.split('\t')
      return { status, path: path.slice(prefix.length) }
    })

  const files = changed.map(({ status, path }) => {
    const dest = `${c.to}/${path}`
    const skip = matchRule(c.skip, path)
    if (skip) return { status, path, dest, action: 'skip', why: skip.why }

    const ours = readSuvana(dest)
    const base = status === 'A' ? null : up(c.synced, path)
    const theirs = status === 'D' ? null : up(to, path)
    const coupling = matchRule(c.couplings, path) ?? matchRule(c.suvanaOnly, path)

    // Already identical to the new upstream: nothing to do, whatever it is.
    if (same(ours, theirs) || (status === 'D' && ours === null)) {
      return { status, path, dest, action: 'none', why: 'Suvana already matches' }
    }
    // Untouched in Suvana since the last sync, or new upstream and absent
    // here: upstream's version wins as-is.
    if ((status === 'A' && ours === null) || (!coupling && same(ours, base))) {
      return { status, path, dest, action: 'take', theirs }
    }
    // Suvana changed it (declared or not): a real three-way merge.
    const why = coupling ? `coupling: ${coupling.why}` : 'UNDECLARED Suvana edit'
    if (status === 'D') return { status, path, dest, action: 'merge', why: `${why}; upstream deleted it` }
    if (ours === null) return { status, path, dest, action: 'merge', why: `${why}; missing in Suvana` }
    const merged = mergeFile(ours, base ?? Buffer.alloc(0), theirs)
    return { status, path, dest, action: 'merge', why, ...merged }
  })

  // Divergence at the synced commit: what Suvana changed relative to the
  // upstream it claims to match. Declared couplings are expected; anything
  // else is either Learn work done on the Suvana side (port it back) or an
  // accident.
  const upAtSynced = upstreamTree(repo, c.synced, from)
  const ours = new Set(suvanaTree(c.to))
  const undeclared = []
  const staleDeclarations = []
  for (const p of new Set([...upAtSynced.keys(), ...ours])) {
    if (declared(p)) continue // expected to differ; never read (skips include ~300 MB of FBX)
    const a = ours.has(p) ? readSuvana(`${c.to}/${p}`) : null
    const oid = upAtSynced.get(p)
    // Fast path: same blob id. Slow path only when the upstream blob was
    // committed with CRLF, which the normalised hash cannot match.
    if (a !== null && oid && (blobId(a) === oid || same(a, up(c.synced, p)))) continue
    undeclared.push({ path: p, kind: a === null ? 'missing in Suvana' : !oid ? 'Suvana-only' : 'edited in Suvana' })
  }
  for (const [pattern] of Object.entries(c.couplings ?? {})) {
    const re = globToRegExp(pattern)
    const hits = [...ours].filter((p) => re.test(p))
    const unchanged = (p) => {
      const a = readSuvana(`${c.to}/${p}`)
      return upAtSynced.has(p) && (blobId(a) === upAtSynced.get(p) || same(a, up(c.synced, p)))
    }
    if (hits.length && hits.every(unchanged)) {
      staleDeclarations.push(pattern)
    }
  }

  return { repo, to, commits, files, undeclared, staleDeclarations }
}

function mergeFile(ours, base, theirs) {
  if (isBinary(ours) || isBinary(theirs)) return { conflicts: 1, merged: null, binary: true }
  const dir = mkdtempSync(join(tmpdir(), 'suvana-sync-'))
  try {
    const f = (name, buf) => {
      const p = join(dir, name)
      writeFileSync(p, normalise(buf))
      return p
    }
    const r = git(dir, ['merge-file', '-p', '-L', 'suvana', '-L', 'upstream (last sync)', '-L', 'upstream (new)',
      f('ours', ours), f('base', base), f('theirs', theirs)], { buffer: true, allowFail: true })
    if (r.status < 0) throw new Error(`git merge-file failed: ${r.stderr}`)
    return { conflicts: r.status, merged: r.stdout }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------- commands

function printStatus(c, a) {
  const upToDate = a.to === c.synced || a.commits.length === 0
  console.log(`\n■ ${c.id}  ${c.upstream}:${c.from} → ${c.to}`)
  console.log(`  synced ${short(c.synced)}  ·  upstream head ${short(a.repo.head)}${upToDate ? '  ·  nothing new upstream' : ''}`)
  if (a.commits.length) {
    console.log(`  ${a.commits.length} new upstream commit(s) touching this folder:`)
    for (const line of a.commits) {
      const [h, d, who, s] = line.split('\t')
      console.log(`    ${h} ${d} ${who.padEnd(14).slice(0, 14)} ${s}`)
    }
  }
  const groups = { take: [], merge: [], skip: [], none: [] }
  for (const f of a.files) groups[f.action].push(f)
  if (groups.take.length) {
    console.log(`  take (${groups.take.length}) — untouched in Suvana, upstream wins:`)
    for (const f of groups.take) console.log(`    ${f.status} ${f.path}`)
  }
  if (groups.merge.length) {
    console.log(`  merge (${groups.merge.length}) — Suvana changed these too:`)
    for (const f of groups.merge) {
      const result = f.binary ? 'binary, merge by hand' : f.conflicts === undefined ? 'by hand' : f.conflicts ? `${f.conflicts} conflict(s)` : 'merges cleanly'
      console.log(`    ${f.status} ${f.path}  [${result}]  ${f.why}`)
    }
  }
  if (groups.skip.length) {
    console.log(`  skip (${groups.skip.length}) — per manifest:`)
    for (const f of groups.skip) console.log(`    ${f.status} ${f.path}  ${f.why}`)
  }
  if (groups.none.length) console.log(`  already identical: ${groups.none.length} file(s)`)
  if (a.undeclared.length) {
    console.log(`  ⚠ ${a.undeclared.length} undeclared difference(s) from upstream at ${short(c.synced)}:`)
    for (const u of a.undeclared) console.log(`    ${u.path}  (${u.kind})`)
    console.log('    → port Suvana-side work back upstream, or declare it in upstreams.json')
  }
  if (a.staleDeclarations.length) {
    console.log(`  ℹ declared but now identical to upstream (remove from the manifest): ${a.staleDeclarations.join(', ')}`)
  }
}

function cmdStatus(ids) {
  const m = manifest()
  const list = ids.length ? ids.map((id) => component(m, id)) : m.components
  let attention = false
  for (const c of list) {
    const a = analyse(m, c)
    printStatus(c, a)
    if (a.commits.length || a.undeclared.length) attention = true
  }
  console.log(attention ? '\nSomething needs a decision — see above.' : '\nEverything matches its upstream.')
}

function cmdApply([id, ...rest]) {
  if (!id) throw new Error('usage: apply <component> [--force]')
  const m = manifest()
  const c = component(m, id)
  const dirty = git(ROOT, ['status', '--porcelain', '--', `${c.to}/`]).stdout.trim()
  if (dirty && !rest.includes('--force')) {
    throw new Error(`${c.to} has uncommitted changes; commit or stash them first (or pass --force).`)
  }
  const a = analyse(m, c)
  printStatus(c, a)
  let conflicts = 0
  for (const f of a.files) {
    if (f.action === 'take') {
      if (f.status === 'D') unlinkSync(join(ROOT, f.dest))
      else writeSuvana(f.dest, f.theirs)
    } else if (f.action === 'merge' && f.merged) {
      writeSuvana(f.dest, f.merged)
      conflicts += f.conflicts
    }
  }
  const byHand = a.files.filter((f) => f.action === 'merge' && !f.merged)
  console.log(`\nApplied. ${conflicts} conflict block(s) to resolve${byHand.length ? `, ${byHand.length} file(s) to merge by hand` : ''}.`)
  console.log(`Next: resolve, run the component's gates, then  node tools/sync/sync.mjs record ${c.id}`)
}

function cmdRecord([id, rev, ...rest]) {
  if (!id) throw new Error('usage: record <component> [upstream-rev] [--force]')
  if (rev === '--force') [rev, rest] = [undefined, ['--force']]
  const m = manifest()
  const c = component(m, id)
  const repo = openUpstream(m, c.upstream)
  const target = git(repo.dir, ['rev-parse', rev ?? repo.ref]).stdout.trim()
  // Pretend Suvana is already synced at the target, and see what is left.
  const a = analyse(m, { ...c, synced: target }, target)
  if (a.undeclared.length && !rest.includes('--force')) {
    printStatus({ ...c, synced: target }, a)
    throw new Error(`Refusing to record ${short(target)}: Suvana differs from it in undeclared ways (see above).`)
  }
  c.synced = target
  c.recorded = new Date().toISOString().slice(0, 10)
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(m, null, 2)}\n`)
  console.log(`${c.id}: synced = ${short(target)} (${c.recorded}). Update the README re-sync log to match.`)
}

/** Offline. Fails CI when a declared coupling has gone missing. */
function cmdGuard() {
  const m = manifest()
  const failures = []
  let checks = 0
  const tracked = git(ROOT, ['ls-files']).stdout.split('\n').filter(Boolean)
  const asTest = (s) => (s.startsWith('re:') ? (t) => new RegExp(s.slice(3), 'm').test(t) : (t) => t.includes(s))

  const guards = [...(m.guards ?? [])]
  for (const c of m.components) {
    for (const p of Object.keys(c.suvanaOnly ?? {})) {
      if (!/[*?]/.test(p)) guards.push({ file: `${c.to}/${p}`, why: `Suvana-only file in ${c.id}` })
    }
    guards.push(...(c.guards ?? []).map((g) => ({ ...g, file: g.file && `${c.to}/${g.file}`, files: g.files && `${c.to}/${g.files}` })))
  }

  for (const g of guards) {
    const paths = g.files ? tracked.filter((p) => globToRegExp(g.files).test(p)) : [g.file]
    for (const p of paths) {
      checks++
      const buf = readSuvana(p)
      if (buf === null) {
        failures.push(`${p}: missing — ${g.why}`)
        continue
      }
      const text = buf.toString('utf8').replace(/\r\n/g, '\n')
      for (const s of g.has ?? []) if (!asTest(s)(text)) failures.push(`${p}: lost "${s}" — ${g.why}`)
      for (const s of g.lacks ?? []) if (asTest(s)(text)) failures.push(`${p}: contains "${s}" — ${g.why}`)
    }
  }
  if (failures.length) {
    console.error(`✗ ${failures.length} sync guard(s) failed:\n  ${failures.join('\n  ')}`)
    console.error('\nA re-sync probably overwrote a Suvana coupling. See tools/sync/README.md.')
    process.exit(1)
  }
  console.log(`✓ ${checks} sync guard check(s) passed.`)
}

// ---------------------------------------------------------------- main

const [cmd, ...args] = process.argv.slice(2)
const commands = { status: cmdStatus, apply: cmdApply, record: cmdRecord, guard: cmdGuard }
try {
  if (!commands[cmd]) {
    console.log('usage: node tools/sync/sync.mjs <status [id...] | apply <id> | record <id> [rev] | guard>')
    process.exit(cmd ? 1 : 0)
  }
  commands[cmd](args)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
