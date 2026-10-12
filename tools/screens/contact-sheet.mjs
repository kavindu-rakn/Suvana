#!/usr/bin/env node

/**
 * tools/screens/contact-sheet.mjs
 * Generates an index.html contact sheet comparing before & after screenshots for kvn's review.
 *
 * Usage:
 *   node tools/screens/contact-sheet.mjs <TASK>
 *
 * Output:
 *   <worktree>/.agent-local/screens/<TASK>/index.html
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const taskId = process.argv[2]
if (!taskId) {
  console.error('Usage: node tools/screens/contact-sheet.mjs <TASK_ID>')
  process.exit(1)
}

let worktreeRoot = process.cwd()
try {
  worktreeRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
} catch {
  // fallback to cwd
}

const screenDir = path.join(worktreeRoot, '.agent-local', 'screens', taskId)

if (!fs.existsSync(screenDir)) {
  console.error(`Error: Screenshot directory not found: ${screenDir}`)
  process.exit(1)
}

const files = fs.readdirSync(screenDir).filter((f) => f.endsWith('.png'))

if (files.length === 0) {
  console.warn(`Warning: No PNG screenshots found in ${screenDir}`)
}

// Group images into pairs by target (e.g., "desktop", "phone", "desktop-fixtures", etc.)
const pairs = new Map()

for (const file of files) {
  const match = file.match(/^(before|after)-(desktop|phone|layout-360)(?:-(.+))?\.png$/)
  if (match) {
    const [, label, vp, suffix] = match
    const groupKey = suffix ? `${vp} (${suffix})` : vp
    if (!pairs.has(groupKey)) {
      pairs.set(groupKey, { vp, suffix: suffix || '', before: null, after: null })
    }
    pairs.get(groupKey)[label] = file
  } else {
    // Unmatched PNG fallback
    const key = file.replace(/\.png$/, '')
    if (!pairs.has(key)) {
      pairs.set(key, { vp: 'other', suffix: '', before: null, after: null, single: file })
    }
  }
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${taskId} Screenshot Contact Sheet — Suvana</title>
  <style>
    :root {
      --bg: #0b1313;
      --card-bg: #142020;
      --card-border: rgba(255, 255, 255, 0.1);
      --text: #f0fdfa;
      --text-muted: #94a3b8;
      --accent: #0ea5e9;
      --success: #10b981;
      --danger: #ef4444;
    }
    body {
      margin: 0;
      padding: 32px 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    header {
      max-width: 1400px;
      margin: 0 auto 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.75rem;
      letter-spacing: -0.02em;
    }
    .meta {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: var(--accent);
      color: #fff;
    }
    .decision-panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .grid {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }
    .pair-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .pair-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 12px;
    }
    .comparison-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .comparison-container {
        grid-template-columns: 1fr;
      }
    }
    .pane {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pane-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .pane-header.before { color: #f59e0b; }
    .pane-header.after { color: var(--success); }
    .img-wrap {
      background: #000;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 240px;
    }
    .img-wrap img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.9rem;
      min-height: 240px;
      width: 100%;
      background: rgba(255,255,255,0.02);
      border: 1px dashed var(--card-border);
      border-radius: 8px;
    }
    .phone-container .img-wrap {
      max-width: 390px;
      margin: 0 auto;
    }
    footer {
      max-width: 1400px;
      margin: 48px auto 0;
      padding-top: 24px;
      border-top: 1px solid var(--card-border);
      color: var(--text-muted);
      font-size: 0.85rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <span class="badge">UI Review</span>
      <h1>${taskId} Contact Sheet</h1>
      <div class="meta">
        Generated: ${new Date().toISOString()} | Directory: <code>${screenDir}</code>
      </div>
    </div>
    <div class="decision-panel">
      <strong>kvn Review:</strong>
      <label><input type="radio" name="decision" value="adopt"> Adopt</label>
      <label><input type="radio" name="decision" value="reject"> Reject</label>
      <label><input type="radio" name="decision" value="changes"> Needs revisions</label>
    </div>
  </header>

  <main class="grid">
    ${
      pairs.size === 0
        ? '<div class="placeholder">No screenshots recorded for this task.</div>'
        : Array.from(pairs.entries())
            .map(([groupKey, item]) => {
              const isPhone = item.vp === 'phone' || item.vp === 'layout-360'
              return `
      <section class="pair-card ${isPhone ? 'phone-container' : 'desktop-container'}">
        <div class="pair-title">
          <span>Viewport: ${groupKey}</span>
          <span style="font-size: 0.85rem; color: var(--text-muted);">${isPhone ? 'Mobile View' : 'Desktop View'}</span>
        </div>
        <div class="comparison-container">
          <div class="pane">
            <div class="pane-header before">
              <span>Before (main)</span>
              <span>${item.before || 'None'}</span>
            </div>
            ${
              item.before
                ? `<div class="img-wrap"><a href="${item.before}" target="_blank"><img src="${item.before}" alt="Before ${groupKey}" loading="lazy"></a></div>`
                : '<div class="placeholder">No "before" screenshot available</div>'
            }
          </div>

          <div class="pane">
            <div class="pane-header after">
              <span>After (branch)</span>
              <span>${item.after || 'None'}</span>
            </div>
            ${
              item.after
                ? `<div class="img-wrap"><a href="${item.after}" target="_blank"><img src="${item.after}" alt="After ${groupKey}" loading="lazy"></a></div>`
                : '<div class="placeholder">No "after" screenshot available</div>'
            }
          </div>
        </div>
      </section>`
            })
            .join('\n')
    }
  </main>

  <footer>
    Suvana R26-SE-019 • Automated Screenshot Review System • Generated for kvn
  </footer>
</body>
</html>
`

const outPath = path.join(screenDir, 'index.html')
fs.writeFileSync(outPath, html, 'utf8')
console.log(`[contact-sheet] Wrote contact sheet: ${outPath}`)
