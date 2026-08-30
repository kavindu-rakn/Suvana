/**
 * The Suvana AI assistant widget — a self-injecting chat panel for the shell.
 *
 * Re-skinned from the widget on the Recognize page into Suvana's own language
 * (teal/gold, Noto Serif, the light/dark token set), and rebuilt so it stands
 * on its own: the knowledge base is a static asset and the optional model call
 * goes straight to Google, so nothing here needs a Python service running.
 */

import { loadKnowledgeBase, SignKnowledgeBase } from './kb'
import type { SignCard } from './kb'
import { buildContext, localAnswer } from './engine'
import type { Answer } from './engine'
import {
  KEYS_URL,
  NoModelAccess,
  PREFERRED_MODEL,
  askAssistant,
  probeProxy,
  readKey,
  readModelPreference,
  verifyKey,
  writeKey,
  writeModelPreference,
} from './gemini'
import type { Turn } from './gemini'

const SIGNS_URL = '/data/signs.json'

const ICON_SPARK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>'
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
const ICON_GEAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>'
const ICON_SEND =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
const ICON_SPEAK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 8.5a5 5 0 0 1 0 7" stroke-linecap="round"/></svg>'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[c]};`)
}

/**
 * The narrow slice of markdown the answers actually use. Everything is escaped
 * first, so model output can never inject markup into the page.
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
  const speak = canSpeak
    ? `<button class="svn-ai-speak" type="button" data-speak="${escapeHtml(card.sinhala)}" aria-label="Speak ${escapeHtml(card.sinhala)}">${ICON_SPEAK}</button>`
    : ''
  return `
    <article class="svn-ai-card">
      <div class="svn-ai-card-head">
        <div>
          <p class="svn-ai-card-si" lang="si">${escapeHtml(card.sinhala)}</p>
          ${gloss}
        </div>
        ${speak}
      </div>
      <p class="svn-ai-card-meta"><span class="svn-ai-chip-tag">${escapeHtml(card.categoryLabel)}</span> <code>${escapeHtml(card.label)}</code></p>
      <ul class="svn-ai-card-tips">${card.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <a class="svn-ai-card-cta" href="/learn/">Practise this in Learn &rarr;</a>
    </article>`
}

export function mountAssistant(): void {
  let kb = new SignKnowledgeBase([])
  let open = false
  let busy = false
  const history: Turn[] = []

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
          <button class="svn-ai-icon" type="button" data-act="settings" aria-expanded="false" aria-label="Assistant settings">${ICON_GEAR}</button>
          <button class="svn-ai-icon" type="button" data-act="close" aria-label="Close assistant">${ICON_CLOSE}</button>
        </div>
      </header>

      <div class="svn-ai-settings" hidden>
        <p class="svn-ai-settings-lead" data-field="route">Checking how this deployment answers&hellip;</p>
        <details class="svn-ai-advanced">
          <summary>Use your own Gemini key instead</summary>
          <p class="svn-ai-settings-lead">
            Only needed when this deployment has no model access of its own.
            The key stays in this browser and is sent only to Google &mdash; it
            never reaches a Suvana server.
          </p>
        <label class="svn-ai-field">
          <span>Gemini API key</span>
          <input type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" data-field="key" />
        </label>
        <label class="svn-ai-field">
          <span>Model</span>
          <input type="text" autocomplete="off" spellcheck="false" placeholder="${PREFERRED_MODEL}" data-field="model" />
          <span class="svn-ai-field-hint">
            A preference, not a requirement &mdash; model ids retire. If this one
            isn&rsquo;t available to your key, the closest one that is gets used.
          </span>
        </label>
        <div class="svn-ai-settings-actions">
          <button class="svn-ai-btn" type="button" data-act="save-key">Save &amp; verify</button>
          <button class="svn-ai-btn ghost" type="button" data-act="clear-key">Remove key</button>
          <a class="svn-ai-link" href="${KEYS_URL}" target="_blank" rel="noopener noreferrer">Get a free key &rarr;</a>
        </div>
        <p class="svn-ai-settings-note" data-field="key-status"></p>
        </details>
      </div>

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
  const settings = root.querySelector<HTMLElement>('.svn-ai-settings')!
  const keyInput = root.querySelector<HTMLInputElement>('[data-field="key"]')!
  const modelInput = root.querySelector<HTMLInputElement>('[data-field="model"]')!
  const keyStatus = root.querySelector<HTMLElement>('[data-field="key-status"]')!
  const routeLine = root.querySelector<HTMLElement>('[data-field="route"]')!

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
    const badge = answer.via === 'gemini' ? '<span class="svn-ai-via">Gemini</span>' : ''
    const notice = answer.notice ? `<p class="svn-ai-notice">${escapeHtml(answer.notice)}</p>` : ''
    el.innerHTML = `
      <div class="svn-ai-bubble">
        ${badge}
        ${renderMarkdown(answer.text)}
        ${notice}
        ${answer.cards.map((c) => cardHtml(c, canSpeak)).join('')}
      </div>`
    log.appendChild(el)
    scrollDown()
    return el
  }

  function addThinking(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'svn-ai-msg is-ai'
    el.innerHTML = '<div class="svn-ai-bubble"><span class="svn-ai-dots"><i></i><i></i><i></i></span></div>'
    log.appendChild(el)
    scrollDown()
    return el
  }

  function setChips(chips: string[]) {
    chipRow.innerHTML = chips
      .map((c) => `<button class="svn-ai-chip" type="button">${escapeHtml(c)}</button>`)
      .join('')
  }

  async function ask(message: string) {
    if (busy || !message.trim()) return
    busy = true
    input.value = ''
    addUser(message)
    setChips([])

    const base = localAnswer(kb, message)

    // With no index there is nothing to ground a model answer in, so do not
    // spend a call on it — the local reply already explains the situation.
    if (!kb.size) {
      addAssistant(base)
      setChips(base.chips)
      history.push({ role: 'user', content: message }, { role: 'assistant', content: base.text })
      busy = false
      return
    }

    const thinking = addThinking()
    try {
      // Suvana's own model access first, then a personal key, then neither.
      // Note this runs even with no key saved: the visitor path is the proxy,
      // and short-circuiting on an empty key would mean it was never used.
      const { text } = await askAssistant(message, history, buildContext(kb, message))
      thinking.remove()
      addAssistant({ ...base, text, via: 'gemini' })
      history.push({ role: 'user', content: message }, { role: 'assistant', content: text })
    } catch (err) {
      thinking.remove()
      if (err instanceof NoModelAccess) {
        // No model access anywhere. That is a supported configuration, not a
        // failure, so the local answer stands with no apology attached.
        addAssistant(base)
      } else {
        // Never leave the user without a reply — fall back and say why, in one
        // short line. Google's raw error is often a paragraph of migration
        // advice, which is not what someone asking about a sign needs to read.
        const raw = err instanceof Error ? err.message : ''
        const why = raw.split(/(?<=[.!?])\s/)[0]?.trim() || 'The model call failed.'
        addAssistant({ ...base, notice: `${why} Answered from Suvana’s own index.` })
      }
      history.push({ role: 'user', content: message }, { role: 'assistant', content: base.text })
    } finally {
      setChips(base.chips)
      busy = false
      input.focus()
    }
  }

  function toggle(next = !open) {
    open = next
    panel.hidden = !open
    if (!open) {
      settings.hidden = true
      root.classList.remove('is-settings')
    }
    root.classList.toggle('is-open', open)
    launcher.setAttribute('aria-expanded', String(open))
    if (open) {
      input.focus()
      if (!log.childElementCount) {
        const greeting = localAnswer(kb, 'hello')
        addAssistant(greeting)
        setChips(greeting.chips)
      }
    }
  }

  launcher.addEventListener('click', () => toggle())

  root.addEventListener('click', async (e) => {
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
      case 'settings':
        settings.hidden = !settings.hidden
        // Settings takes over the panel body instead of sharing it: sharing
        // left the log a few pixels tall with the chip row overlapping the
        // fields, which read as a broken layout rather than a drawer.
        root.classList.toggle('is-settings', !settings.hidden)
        btn.setAttribute('aria-expanded', String(!settings.hidden))
        if (!settings.hidden) {
          keyInput.value = readKey()
          modelInput.value = readModelPreference()
          keyInput.focus()
          // Say plainly which of the two routes is answering, so nobody has to
          // guess whether the key field matters on this deployment.
          void probeProxy().then((ok) => {
            routeLine.innerHTML = ok
              ? 'Replies come from <strong>Suvana&rsquo;s own model access</strong>. ' +
                'Nothing to set up &mdash; no key is needed here.'
              : 'This deployment has no model access of its own, so replies come ' +
                'from <strong>Suvana&rsquo;s sign index</strong> in fixed phrasing. ' +
                'Add a key below to make them conversational.'
          })
        } else {
          input.focus()
        }
        break
      case 'save-key': {
        const key = keyInput.value.trim()
        if (!key) {
          keyStatus.textContent = 'Paste a key first.'
          keyStatus.dataset.tone = 'bad'
          return
        }
        keyStatus.textContent = 'Checking…'
        delete keyStatus.dataset.tone
        // Saved before verifying: verifyKey resolves against this preference,
        // so writing it afterwards would have checked the previous model.
        writeModelPreference(modelInput.value.trim() || PREFERRED_MODEL)
        const result = await verifyKey(key)
        keyStatus.textContent = result.message
        keyStatus.dataset.tone = result.ok ? 'good' : 'bad'
        if (result.ok) writeKey(key)
        break
      }
      case 'clear-key':
        writeKey('')
        keyInput.value = ''
        modelInput.value = PREFERRED_MODEL
        keyStatus.textContent = 'Key removed — answers come from Suvana’s own index.'
        keyStatus.dataset.tone = 'good'
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

  void loadKnowledgeBase(SIGNS_URL).then((loaded) => {
    kb = loaded
    sub.textContent = kb.size
      ? `Tutor for all ${kb.size} signs Suvana recognises`
      : 'Sign index unavailable'
  })
}
