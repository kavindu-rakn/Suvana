/**
 * The Alerts page.
 *
 * Alerts is a phone app, so the only thing this page can actually *do* is pair
 * a device with the bundler running on this machine. The QR is drawn in the
 * browser from an address the user supplies, which is what keeps the page
 * useful with no Suvana service running: the browser cannot discover this
 * machine's LAN IP on its own, but Expo prints it, and the recognition
 * service can volunteer it when it happens to be up.
 */

import qrcode from 'qrcode-generator'
import { initTheme } from './theme'
import { mountAssistant } from './assistant/widget'

initTheme()
mountAssistant()

const input = document.getElementById('metro-url') as HTMLInputElement | null
const frame = document.getElementById('qr-frame')
const status = document.getElementById('connect-status')
const link = document.getElementById('qr-link') as HTMLAnchorElement | null

const STORAGE_KEY = 'suvana.alerts.metroUrl'
const DEFAULT_PORT = 8081

/**
 * Accept whatever Expo actually printed, or just the IP. Anything that names a
 * host is enough — the scheme and port have sensible defaults, and requiring
 * the exact string is the kind of friction that gets a demo abandoned.
 */
function normalise(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const bare = /^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?$/.exec(value)
  if (bare) return `exp://${bare[1]}:${bare[2] ?? DEFAULT_PORT}`

  if (/^(exp|exps|http|https):\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const port = url.port || String(DEFAULT_PORT)
      // http(s) is what a browser-copied address looks like; the app wants exp.
      const scheme = url.protocol.startsWith('exp') ? url.protocol.replace(':', '') : 'exp'
      return `${scheme}://${url.hostname}:${port}`
    } catch {
      return null
    }
  }

  // A bare hostname (e.g. a .local mDNS name) is still a valid target.
  if (/^[a-z0-9][a-z0-9.-]*$/i.test(value)) return `exp://${value}:${DEFAULT_PORT}`
  return null
}

function draw(url: string): void {
  if (!frame) return
  // Type 0 = smallest version that fits; 'M' correction survives a phone
  // camera reading a screen at an angle.
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()
  // createSvgTag scales to the frame instead of baking a pixel size in.
  frame.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
}

function apply(raw: string, source: 'typed' | 'restored' | 'service'): void {
  const url = normalise(raw)

  if (!url) {
    if (frame) frame.innerHTML = '<p class="qr-empty">The code appears here</p>'
    if (link) link.hidden = true
    if (status) {
      status.textContent = raw.trim()
        ? "That doesn't look like an address — try exp://192.168.1.5:8081"
        : 'Waiting for an address.'
      status.dataset.tone = raw.trim() ? 'bad' : ''
    }
    return
  }

  draw(url)
  if (link) {
    link.href = url
    link.hidden = false
  }
  if (status) {
    status.textContent =
      source === 'service'
        ? `Found this machine at ${url} — scan it with the installed Suvana app.`
        : `Scan with the installed Suvana app · ${url}`
    status.dataset.tone = 'good'
  }
  try {
    localStorage.setItem(STORAGE_KEY, raw.trim())
  } catch {
    /* private browsing */
  }
}

if (input) {
  input.addEventListener('input', () => apply(input.value, 'typed'))

  let restored = ''
  try {
    restored = localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    /* private browsing */
  }
  if (restored) {
    input.value = restored
    apply(restored, 'restored')
  }

  // The recognition service exposes /api/soundguard/info, which already knows
  // this machine's LAN address — but it serves no CORS headers (deliberately:
  // it is same-origin with its own page, see DEPLOY-SUVANA.md), so the shell
  // cannot read it, and adding CORS would mean editing a server.py that is
  // kept byte-identical to the team repo for clean re-syncs. Typing the
  // address Expo already printed is the cheaper answer, and it works with no
  // Suvana service running at all — which is the point of this page.
  //
  // A query string is honoured so the address can be shared as a link:
  //   /alerts/?url=exp://192.168.1.5:8081
  if (!restored) {
    const fromQuery = new URLSearchParams(window.location.search).get('url')
    if (fromQuery) {
      input.value = fromQuery
      apply(fromQuery, 'service')
    }
  }
}
