import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Parse strings, templates and JSX text so comments/variable names do not cause
// false failures. Reuse Learn's locked compiler; no new dependency or lockfile.
const require = createRequire(new URL('../../apps/learn/package.json', import.meta.url))
const ts = require('typescript')
// Match names, not corpus labels such as "osawanawa".
const brand = /(?<![a-z])(?:SoundGuard|SignSpeak|Sawana)(?![a-z])/i
const roots = ['apps/shell', 'apps/alerts', 'apps/communicate/app', 'services/recognition/webapp/static']
const internalValues = {
  'apps/alerts/components/AudioGovernor.tsx': ['soundguard'],
  'apps/alerts/app/index.tsx': ['soundguard'],
  'apps/alerts/utils/audioArbiter.ts': ['soundguard'],
  'apps/alerts/utils/soundEngine.ts': ['soundguard', '[SoundGuard]'],
  'apps/alerts/app/transcribe.tsx': ['soundguard-live-transcribe'],
  'apps/alerts/components/ThreatLockOverlay.tsx': ['soundguard-threat-lock'],
  'apps/alerts/utils/notifications.ts': ['soundguard-threat', 'soundguard-detection-'],
  'apps/alerts/utils/storage.ts': ['@soundguard/emergency_contacts', '@soundguard/settings',
    '@soundguard/detection_log', '@soundguard/reply_history'],
  'apps/alerts/app.json': ['./plugins/withSoundGuardBackground'],
}

function allowedText(file, text) {
  if (file === 'apps/communicate/app/contribute/ContributeClient.tsx' &&
      text === 'signspeak.contribute.speakerKey') return ''
  if (file === 'apps/shell/src/assistant/model.ts') {
    text = text.replace('- Never use a sub-brand name (Sawana, SignSpeak, SoundGuard). The modules are Recognize, Communicate, Learn and Alerts.', '')
  }
  // Existing audio ownership/storage/notification IDs are not display copy.
  if (internalValues[file]?.includes(text)) return ''
  if (file === 'apps/alerts/plugins/withSoundGuardBackground.js') {
    // This plugin embeds generated Java. Keep checking its notification copy.
    text = text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
      token => token.startsWith('/') ? '' : token)
      .replace(/\bSoundGuard(?:ForegroundService|ServiceModule|ServicePackage|BackgroundService)\b/g, '')
      .replace(/soundguard-capture-v1|com\.soundguard\.capture\.(?:START|STOP)|SoundGuard::Capture|\[withSoundGuardBackground\]/g, '')
  }
  if (file.startsWith('services/recognition/webapp/static/')) {
    text = text.replace(/\/api\/soundguard\/info|soundguard\.js|soundguard\.css|soundguard-qr|\.soundguard-section\b/g, '')
  }
  return text
}

export function brandViolations(file, source) {
  const errors = []
  const check = (text, position, visibleJsx = false) => {
    if (brand.test(visibleJsx ? text : allowedText(file, text))) {
      const line = source.slice(0, position).split('\n').length
      errors.push(`${file}:${line}: ${text.trim().slice(0, 180)}`)
    }
  }
  if (/\.(?:html|svg|css)$/.test(file)) {
    // Preserve line numbers while removing comments; HTML includes inline JS.
    const text = source.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g,
      comment => comment.replace(/[^\n]/g, ' '))
    text.split('\n').reduce((offset, line) => { check(line, offset); return offset + line.length + 1 }, 0)
  } else {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    const visit = node => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        check(node.text, node.getStart(ast), ts.isJsxText(node) || ts.isJsxAttribute(node.parent))
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = fileURLToPath(new URL('../../', import.meta.url))
  const files = execFileSync('git', ['ls-files', '-z', '--', ...roots], { cwd: repo, encoding: 'utf8' })
    .split('\0').filter(file => /\.(?:[cm]?js|jsx|tsx?|html|svg|css|json)$/.test(file) &&
      !/\.(?:test|spec)\.[^.]+$/.test(file) && !/\/package(?:-lock)?\.json$/.test(file))
  const errors = files.flatMap(file => brandViolations(file, readFileSync(resolve(repo, file), 'utf8')))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log(`Brand source grep passed (${files.length} tracked source files)`)
}
