/**
 * The Suvana AI assistant widget — a self-injecting chat panel for the shell.
 *
 * Re-skinned from the widget on the Recognize page into Suvana's own language
 * (teal/gold, Noto Serif, the light/dark token set), and rebuilt so it stands
 * on its own: the verified knowledge base is a static asset and every reply
 * is produced in this browser. No provider or assistant server is called.
 */

import { loadKnowledgeBase, SignKnowledgeBase } from './kb'
import type { SignCard } from './kb'
import { localAnswer } from './engine'
import type { Answer } from './engine'

const ICON_SPARK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>'
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
const ICON_SEND =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
const ICON_SPEAK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 8.5a5 5 0 0 1 0 7" stroke-linecap="round"/></svg>'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[c]};`)
}

/**
 * The narrow slice of markdown the answers actually use. Everything is escaped
 * first, so answer text can never inject markup into the page.
 */
function renderMarkdown(text: string): string {
  const html = escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')

  return html
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n')
      if (lines.every((l) => l.trim().startsWith('•'))) {
        return `<ul>${lines.map((l) => `<li>${l.replace(/^\s*•\s*/, '')}</li>`).join('')}</ul>`
      }
      return `<p>${lines.join('<br>')}</p>`
    })
    .join('')
}

/**
 * A Sinhala-capable voice, if the device has one. Reading Sinhala script with
 * an English voice produces noise, so the speaker button only appears when a
 * real voice exists rather than promising audio we cannot deliver.
 */
function sinhalaVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => /^si\b/i.test(v.lang)) ?? null
}

function cardHtml(card: SignCard, canSpeak: boolean): string {
  const gloss = card.english ? `<p class="svn-ai-card-gloss">${escapeHtml(card.english)}</p>` : ''
  const speak = canSpeak && card.sinhala
    ? `<button class="svn-ai-speak" type="button" data-speak="${escapeHtml(card.speakText)}" aria-label="Speak ${escapeHtml(card.sinhala)}">${ICON_SPEAK}</button>`
    : ''
  return `
    <article class="svn-ai-card">
      <div class="svn-ai-card-head">
        <div>
          <p class="svn-ai-card-si"${card.sinhala ? ' lang="si"' : ''}>${escapeHtml(card.sinhala || card.label)}</p>
          ${gloss}
        </div>
        ${speak}
      </div>
      <p class="svn-ai-card-meta"><span class="svn-ai-chip-tag">${escapeHtml(card.categoryLabel)}</span> <code>${escapeHtml(card.label)}</code></p>
      ${card.units.length ? `<p class="svn-ai-card-meta">Learn: ${card.units.map(escapeHtml).join(', ')}</p>` : ''}
      <p class="svn-ai-card-meta">${card.recognizeLabel ? 'Listed in Recognize' : 'Not listed in Recognize'}</p>
      ${card.learnUrl ? `<a class="svn-ai-card-cta" href="${escapeHtml(card.learnUrl)}">Watch this sign in Learn &rarr;</a>` : '<p class="svn-ai-card-meta">No exact-name recording in Learn</p>'}
    </article>`
}

export function mountAssistant(): void {
  let kb = new SignKnowledgeBase([])
  let open = false
  let busy = false
  // D-A37: remove credentials/preferences left by earlier widget versions.
  for (const key of ['suvana.assistant.geminiKey', 'suvana.assistant.geminiModel', 'suvana.assistant.geminiResolved']) {
    try { localStorage.removeItem(key) } catch { /* storage may be disabled */ }
  }

  const root = document.createElement('div')
  root.className = 'svn-ai'
  // data-lenis-prevent: the shell runs Lenis globally with smoothWheel, which
  // swallows wheel and touch events from every nested scroll container — the
  // message log included, leaving the scrollbar as the only way to move. This
  // attribute hands those events back to the browser inside the panel, which
  // is also what you want for an overlay: scrolling the chat should never
  // scroll the page behind it.
  root.innerHTML = `
    <div class="svn-ai-launcher-wrap">
      <span class="svn-ai-tip" id="svn-ai-tip" role="tooltip">Ask Suvana AI</span>
      <button
        class="svn-ai-launcher"
        type="button"
        aria-expanded="false"
        aria-controls="svn-ai-panel"
        aria-label="Ask Suvana AI"
        aria-describedby="svn-ai-tip"
      >
        <span class="svn-ai-launcher-icon">${ICON_SPARK}</span>
      </button>
    </div>

    <section class="svn-ai-panel" id="svn-ai-panel" hidden data-lenis-prevent aria-label="Suvana AI assistant">
      <header class="svn-ai-head">
        <div class="svn-ai-title">
          <h2>Suvana AI</h2>
          <p class="svn-ai-sub">Loading the sign index…</p>
        </div>
        <div class="svn-ai-head-actions">
          <button class="svn-ai-icon" type="button" data-act="close" aria-label="Close assistant">${ICON_CLOSE}</button>
        </div>
      </header>

      <div class="svn-ai-log" role="log" aria-live="polite"></div>

      <div class="svn-ai-chips"></div>

      <form class="svn-ai-composer">
        <input type="text" name="q" autocomplete="off" placeholder="Ask about any sign…" aria-label="Ask the assistant" />
        <button type="submit" aria-label="Send">${ICON_SEND}</button>
      </form>
    </section>`

  document.body.appendChild(root)

  const launcher = root.querySelector<HTMLButtonElement>('.svn-ai-launcher')!
  const panel = root.querySelector<HTMLElement>('.svn-ai-panel')!
  const sub = root.querySelector<HTMLElement>('.svn-ai-sub')!
  const log = root.querySelector<HTMLElement>('.svn-ai-log')!
  const chipRow = root.querySelector<HTMLElement>('.svn-ai-chips')!
  const form = root.querySelector<HTMLFormElement>('.svn-ai-composer')!
  const input = form.querySelector<HTMLInputElement>('input')!
  const scrollDown = () => { log.scrollTop = log.scrollHeight }

  function addUser(text: string) {
    const el = document.createElement('div')
    el.className = 'svn-ai-msg is-user'
    el.innerHTML = `<div class="svn-ai-bubble">${escapeHtml(text)}</div>`
    log.appendChild(el)
    scrollDown()
  }

  function addAssistant(answer: Answer): HTMLElement {
    const canSpeak = !!sinhalaVoice()
    const el = document.createElement('div')
    el.className = 'svn-ai-msg is-ai'
    const notice = answer.notice ? `<p class="svn-ai-notice">${escapeHtml(answer.notice)}</p>` : ''
    el.innerHTML = `
      <div class="svn-ai-bubble">
        ${renderMarkdown(answer.text)}
        ${answer.links.map(link => `<p><a class="svn-ai-card-cta" href="${escapeHtml(link.url)}">${escapeHtml(link.label)} &rarr;</a></p>`).join('')}
        ${notice}
        ${answer.cards.map((c) => cardHtml(c, canSpeak)).join('')}
      </div>`
    log.appendChild(el)
    scrollDown()
    return el
  }

  function setChips(chips: string[]) {
    chipRow.innerHTML = chips
      .map((c) => `<button class="svn-ai-chip" type="button">${escapeHtml(c)}</button>`)
      .join('')
  }

  function ask(message: string) {
    if (busy || !message.trim()) return
    busy = true
    input.value = ''
    addUser(message)
    const answer = localAnswer(kb, message)
    addAssistant(answer)
    setChips(answer.chips)
    busy = false
    input.focus()
  }

  function toggle(next = !open) {
    open = next
    panel.hidden = !open
    root.classList.toggle('is-open', open)
    launcher.setAttribute('aria-expanded', String(open))
    if (open) {
      input.focus()
      if (!log.childElementCount) {
        const greeting = localAnswer(kb, '')
        addAssistant(greeting)
        setChips(greeting.chips)
      }
    }
  }

  launcher.addEventListener('click', () => toggle())

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act], .svn-ai-chip, [data-speak]')
    if (!btn) return

    if (btn.classList.contains('svn-ai-chip')) {
      void ask(btn.textContent ?? '')
      return
    }

    const speak = btn.dataset.speak
    if (speak) {
      const voice = sinhalaVoice()
      if (!voice) return
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(speak)
      utter.voice = voice
      utter.lang = voice.lang
      window.speechSynthesis.speak(utter)
      return
    }

    switch (btn.dataset.act) {
      case 'close':
        toggle(false)
        break
    }
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    void ask(input.value)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) toggle(false)
  })

  // Voices populate asynchronously in Chrome; re-render nothing, just make the
  // next card pick the button up.
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => { /* getVoices() is warm now */ }
  }

  void loadKnowledgeBase().then((loaded) => {
    kb = loaded
    sub.textContent = kb.size
      ? 'Recordings, module coverage and practice help'
      : 'Sign index unavailable'
  })
}
