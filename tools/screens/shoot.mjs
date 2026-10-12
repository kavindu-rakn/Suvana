#!/usr/bin/env node

/**
 * tools/screens/shoot.mjs
 * Playwright screenshot shooter for Suvana desktop and phone viewports.
 *
 * Usage:
 *   node tools/screens/shoot.mjs --base <url> --id <TASK> --label before|after --paths /learn/,...
 *
 * Options:
 *   --base <url>          Base URL (default: http://localhost:5174)
 *   --id <TASK>           Task ID (e.g. Q-00, L-01, I-01) [required]
 *   --label <before|after> Screenshot label [required, default: after]
 *   --paths <p1,p2>       Comma-separated paths (default: /learn/)
 *   --state <name>        Optional state name suffix (e.g. result, empty)
 *   --fake-video <y4m>    Path to .y4m video for fake camera capture
 *   --seed <json>         Path to JSON attempts file to seed IndexedDB
 *   --delay <ms>          Delay in ms after page load (default: 800)
 *   --wait-for <sel>      Optional selector to wait for before screenshot
 *   --layout              Also capture 360x800 layout viewport
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { chromium } from 'playwright'

// Parse CLI arguments
function parseArgs(args) {
  const parsed = {
    base: 'http://localhost:5174',
    id: '',
    label: 'after',
    paths: ['/learn/'],
    state: '',
    fakeVideo: '',
    seed: '',
    delay: 800,
    waitFor: '',
    layout: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--base' && args[i + 1]) parsed.base = args[++i]
    else if (arg === '--id' && args[i + 1]) parsed.id = args[++i]
    else if (arg === '--label' && args[i + 1]) parsed.label = args[++i]
    else if (arg === '--paths' && args[i + 1]) {
      parsed.paths = args[++i].split(',').map((p) => p.trim()).filter(Boolean)
    } else if (arg === '--state' && args[i + 1]) parsed.state = args[++i]
    else if (arg === '--fake-video' && args[i + 1]) parsed.fakeVideo = args[++i]
    else if (arg === '--seed' && args[i + 1]) parsed.seed = args[++i]
    else if (arg === '--delay' && args[i + 1]) parsed.delay = Number.parseInt(args[++i], 10)
    else if (arg === '--wait-for' && args[i + 1]) parsed.waitFor = args[++i]
    else if (arg === '--layout') parsed.layout = true
  }

  return parsed
}

const config = parseArgs(process.argv.slice(2))

if (!config.id) {
  console.error('Error: --id <TASK> is required (e.g. --id Q-00)')
  process.exit(1)
}

if (!['before', 'after'].includes(config.label)) {
  console.warn(`Warning: label "${config.label}" is neither "before" nor "after"; continuing...`)
}

// Find git worktree root
let worktreeRoot = process.cwd()
try {
  worktreeRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
} catch {
  // fallback to cwd
}

const outputDir = path.join(worktreeRoot, '.agent-local', 'screens', config.id)
fs.mkdirSync(outputDir, { recursive: true })

console.log(`[shoot] Task ID: ${config.id}`)
console.log(`[shoot] Output dir: ${outputDir}`)
console.log(`[shoot] Base: ${config.base}`)
console.log(`[shoot] Label: ${config.label}`)
console.log(`[shoot] Paths: ${config.paths.join(', ')}`)

const browserArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
]

if (config.fakeVideo) {
  const fakeVideoAbs = path.resolve(config.fakeVideo)
  if (!fs.existsSync(fakeVideoAbs)) {
    console.error(`[shoot] Error: fake-video file not found: ${fakeVideoAbs}`)
    process.exit(1)
  }
  browserArgs.push(`--use-file-for-fake-video-capture=${fakeVideoAbs}`)
  console.log(`[shoot] Using fake video capture: ${fakeVideoAbs}`)
}

let seedData = null
if (config.seed) {
  const seedAbs = path.resolve(config.seed)
  if (!fs.existsSync(seedAbs)) {
    console.error(`[shoot] Error: seed file not found: ${seedAbs}`)
    process.exit(1)
  }
  seedData = JSON.parse(fs.readFileSync(seedAbs, 'utf8'))
  console.log(`[shoot] Seeding IndexedDB from: ${seedAbs}`)
}

const viewports = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false },
  { name: 'phone', width: 390, height: 844, isMobile: true },
]

if (config.layout) {
  viewports.push({ name: 'layout-360', width: 360, height: 800, isMobile: true })
}

async function run() {
  const browser = await chromium.launch({
    args: browserArgs,
    headless: true,
  })

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      permissions: ['camera'],
    })

    if (seedData) {
      const items = Array.isArray(seedData) ? seedData : (seedData.attempts || [])
      await context.addInitScript((entries) => {
        const req = indexedDB.open('ssl-learn', 3)
        req.onupgradeneeded = () => {
          const db = req.result
          for (const s of ['recordings', 'attempts', 'latency']) {
            if (!db.objectStoreNames.contains(s)) {
              db.createObjectStore(s, { keyPath: 'id' })
            }
          }
        }
        req.onsuccess = () => {
          const db = req.result
          if (db.objectStoreNames.contains('attempts')) {
            const tx = db.transaction('attempts', 'readwrite')
            const store = tx.objectStore('attempts')
            for (const item of entries) {
              store.put(item)
            }
            tx.oncomplete = () => db.close()
          } else {
            db.close()
          }
        }
      }, items)
    }

    const page = await context.newPage()

    for (const reqPath of config.paths) {
      const targetUrl = new URL(reqPath, config.base).href
      console.log(`[shoot] Capturing [${vp.name}] ${targetUrl}...`)

      try {
        await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 })
        if (config.waitFor) {
          await page.waitForSelector(config.waitFor, { timeout: 10000 })
        }
        if (config.delay > 0) {
          await page.waitForTimeout(config.delay)
        }

        // Determine filename
        let fileSlug = ''
        if (config.state) {
          fileSlug = `-${config.state}`
        } else if (config.paths.length > 1) {
          const cleanPath = reqPath.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '')
          fileSlug = cleanPath ? `-${cleanPath}` : ''
        }

        const fileName = `${config.label}-${vp.name}${fileSlug}.png`
        const destPath = path.join(outputDir, fileName)

        await page.screenshot({ path: destPath, fullPage: false })
        console.log(`[shoot] Saved: ${destPath}`)
      } catch (err) {
        console.error(`[shoot] Failed to capture ${targetUrl} (${vp.name}):`, err.message)
      }
    }

    await context.close()
  }

  await browser.close()
  console.log(`[shoot] Completed shooting for task ${config.id}.`)
}

run().catch((err) => {
  console.error('[shoot] Fatal error:', err)
  process.exit(1)
})
