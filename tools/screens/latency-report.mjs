// From repo root: node tools/screens/latency-report.mjs [--headed]
// Builds Learn, uses the existing Playwright production-preview configuration,
// and saves aggregate output plus every raw run under ignored .agent-local/.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const learn = path.join(root, 'apps/learn')
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || 'git failed')
  return result.stdout.trim()
}
const headed = process.argv.includes('--headed')
if (process.argv.slice(2).some(arg => arg !== '--headed')) throw new Error('Usage: node tools/screens/latency-report.mjs [--headed]')
const fixture = 'C:/Users/User/Documents/Suvana-wt/_fixtures/hands-sign.y4m'
if (!fs.existsSync(fixture)) throw new Error(`K-13 clip missing: ${fixture}; refusing a synthetic camera fallback`)
const sha = git('rev-parse', 'HEAD')
if (git('status', '--porcelain', '--', 'apps/learn')) throw new Error('Learn source is dirty; commit or restore it before measuring a build SHA')
const dir = path.join(root, '.agent-local/Q-09', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(dir, { recursive: true })
const raw = path.join(dir, 'runs.json')
// shell is used only for the fixed npm command on Windows, with no user text.
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: learn, encoding: 'utf8', shell: process.platform === 'win32',
})
fs.writeFileSync(path.join(dir, 'build.txt'), (build.stdout ?? '') + (build.stderr ?? ''))
if (build.status !== 0) throw new Error(`Production build failed; see ${dir}/build.txt`)
if (git('rev-parse', 'HEAD') !== sha || git('status', '--porcelain', '--', 'apps/learn')) throw new Error('Learn checkout changed during the build')
const vision = fs.readdirSync(path.join(learn, 'dist/learn/assets')).filter(name => /^vision_bundle-.*\.js$/.test(name))
if (vision.length !== 1) throw new Error('Expected exactly one production vision bundle')
const args = ['test', 'e2e/latency.spec.ts', '--project=chromium', '--retries=0', '--workers=1', '--output', path.join(dir, 'playwright')]
if (headed) args.push('--headed')
console.log(`Q-09 started; local evidence: ${dir}`)
const result = spawnSync(process.execPath, [path.join(here, 'node_modules/@playwright/test/cli.js'), ...args], {
  cwd: here, encoding: 'utf8', timeout: 660_000,
  env: { ...process.env, CI: '1', SUVANA_LATENCY: '1', SUVANA_LATENCY_RAW: raw, SUVANA_LATENCY_VISION: `./assets/${vision[0]}` },
})
fs.writeFileSync(path.join(dir, 'playwright.txt'), (result.stdout ?? '') + (result.stderr ?? '') + (result.error ? String(result.error) : ''))
const data = fs.existsSync(raw) ? JSON.parse(fs.readFileSync(raw, 'utf8')) : { runs: [], error: 'Playwright failed before the spec wrote evidence; see playwright.txt' }
const values = data.runs.filter(run => run.status === 'ok').map(run => run.ms).sort((a, b) => a - b)
const n = values.length
const median = n ? (values[Math.floor((n - 1) / 2)] + values[Math.ceil((n - 1) / 2)]) / 2 : null
// Nearest-rank p90: sorted[ceil(0.9*n)-1], stated explicitly for T-03.
const p90 = n ? values[Math.ceil(0.9 * n) - 1] : null
const delegates = (data.delegate ?? []).filter(attempt => attempt.status === 'ready').map(attempt => attempt.delegate)
const failed = data.runs.filter(run => run.status === 'failed')
const unstarted = data.runs.filter(run => run.status === 'not-run')
const report = [
  'Q-09 capture-end to result-shown report',
  `Recorded at: ${new Date().toISOString()} (UTC)`,
  `Learn production build SHA: ${sha} (apps/learn clean; built by this runner)`,
  `CPU: ${os.cpus()[0]?.model ?? 'unknown'}; logical CPUs: ${os.cpus().length}`,
  `RAM: ${os.totalmem()} bytes (${(os.totalmem() / 2 ** 30).toFixed(2)} GiB)`,
  `OS: ${os.type()} ${os.release()} ${os.arch()} (${os.version()})`,
  `Browser: ${data.browser ?? 'unavailable'}; mode: ${headed ? 'headed' : 'headless'}`,
  `Vision delegate used: ${delegates.join(', ') || 'unconfirmed'} (observed successful HandLandmarker.createFromOptions)`,
  `Delegate initialization: ${JSON.stringify(data.delegate ?? null)}`,
  `Input: ${fixture}; loops; local recorded camera input only, never a scoring reference`,
  `Camera track: ${JSON.stringify(data.camera ?? null)}`,
  'Method: one browser/page, BAG EKA Watch -> Try, then Retry; normal automatic capture end; first measured take included; no warm-up discard.',
  'Module observation: same production vision bundle preloaded before Practice; createFromOptions wrapper restored after successful initialization; no detection, scoring, marks or assets replaced.',
  'Interval: suvana:result-shown minus suvana:capture-end (existing double-requestAnimationFrame mark, not physical display instrumentation); excludes camera/model startup and capture duration.',
  `Planned: 20; n: ${n}; failed: ${failed.length}; discarded: 0; not run: ${unstarted.length}`,
  `Median: ${median === null ? 'unavailable' : median.toFixed(3) + ' ms'}; p90 (nearest rank): ${p90 === null ? 'unavailable' : p90.toFixed(3) + ' ms'}`,
  ...data.runs.map(run => run.status === 'ok'
    ? `Run ${run.run}: ok; capture-end=${run.captureEnd.toFixed(3)} ms; result-shown=${run.resultShown.toFixed(3)} ms; difference=${run.ms.toFixed(3)} ms`
    : `Run ${run.run}: ${run.status}; reason=${run.reason}`),
  `O1 feedback within 300 ms: ${n ? `${values.filter(value => value <= 300).length}/${n} measured runs at or below 300 ms; ${values.filter(value => value > 300).length}/${n} above 300 ms.` : 'No valid latency result.'}`,
  'Scope: kvn laptop with a recorded clip; engineering measurement only, not a learner study or a phone figure. No general O1 completion claim.',
  `Playwright exit: ${result.status}; ${data.error ? 'STOP: ' + data.error : 'no run failures reported'}`,
  `Raw evidence: ${raw}`,
].join('\n') + '\n'
fs.writeFileSync(path.join(dir, 'report.txt'), report)
console.log(report)
if (result.status !== 0 || n !== 20 || delegates.length !== 1) process.exitCode = 1
