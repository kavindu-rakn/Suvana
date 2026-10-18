/* ============================================================================
   සුවණ AI ASSISTANT — front-end widget
   ----------------------------------------------------------------------------
   Fully self-contained and non-invasive:
     • Runs inside an IIFE, so it leaks nothing into the global scope.
     • Builds its own DOM subtree and appends it to <body>; it never queries,
       reads or mutates any element belonging to the existing app.
     • Uses its own Audio() instance, so it cannot interfere with the
       recognition speech played through #speechAudio.
     • Every class name is namespaced `svn-ai-`.
   Deleting this file (and its two tags in index.html) restores the app exactly.
   ========================================================================== */

(() => {
  "use strict";

  if (window.__savanaAssistantLoaded) return;
  window.__savanaAssistantLoaded = true;

  const STORE_KEY = "savana.assistant.v1";
  const API = {
    meta: window.SuvanaRecognize.apiPath("/api/assistant/meta"),
    chat: window.SuvanaRecognize.apiPath("/api/assistant/chat"),
    speak: window.SuvanaRecognize.apiPath("/api/speak"),
  };

  // D-A37: discard provider credentials left by the old assistant panel.
  try { localStorage.removeItem(STORE_KEY); } catch (_) { /* storage disabled */ }

  /* ------------------------------------------------------------------ icons */

  const ICON = {
    orb: `<svg width="27" height="27" viewBox="0 0 24 24" fill="none"><path d="M12 3.2 13.7 8a4 4 0 0 0 2.3 2.3l4.8 1.7-4.8 1.7a4 4 0 0 0-2.3 2.3L12 20.8l-1.7-4.8A4 4 0 0 0 8 13.7L3.2 12 8 10.3A4 4 0 0 0 10.3 8L12 3.2Z" fill="#fff"/><circle cx="19" cy="5.4" r="1.5" fill="#fff" opacity=".85"/><circle cx="5.2" cy="18.4" r="1.1" fill="#fff" opacity=".7"/></svg>`,
    spark: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3.5 13.4 8a3.6 3.6 0 0 0 2.1 2.1L20 11.5l-4.5 1.4a3.6 3.6 0 0 0-2.1 2.1L12 19.5l-1.4-4.5a3.6 3.6 0 0 0-2.1-2.1L4 11.5l4.5-1.4A3.6 3.6 0 0 0 10.6 8L12 3.5Z" fill="#fff"/></svg>`,
    close: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    send: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4.5 12 20 4.5 16 20l-4.6-5.4L4.5 12Z" fill="currentColor"/></svg>`,
    speaker: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M17 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
    chevron: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  /* ------------------------------------------------------------------- DOM */

  const root = document.createElement("div");
  root.className = "svn-ai-root";
  root.innerHTML = `
    <button class="svn-ai-launcher" type="button" aria-label="Open Suvana AI assistant">
      ${ICON.orb}<span class="svn-ai-spark">AI</span>
    </button>
    <div class="svn-ai-tip">Ask Suvana AI about any sign</div>

    <section class="svn-ai-panel" role="dialog" aria-label="Suvana AI assistant">
      <header class="svn-ai-head">
        <span class="svn-ai-avatar">${ICON.spark}</span>
        <span class="svn-ai-title">
          <strong>Suvana AI</strong>
          <span><i></i><em data-role="engine">Verified index · ready</em></span>
        </span>
        <button class="svn-ai-headbtn" type="button" data-act="clear" title="Clear conversation" aria-label="Clear conversation">${ICON.trash}</button>
        <button class="svn-ai-headbtn" type="button" data-act="close" title="Close" aria-label="Close assistant">${ICON.close}</button>
      </header>

      <div class="svn-ai-body" data-role="body"></div>

      <footer class="svn-ai-foot">
        <div class="svn-ai-inputrow">
          <textarea class="svn-ai-input" data-role="input" rows="1" placeholder="Ask about any sign…" aria-label="Message"></textarea>
          <button class="svn-ai-send" type="button" data-act="send" aria-label="Send" disabled>${ICON.send}</button>
        </div>
        <div class="svn-ai-foot-note" data-role="note">Verified sources · no account needed</div>
      </footer>

    </section>
  `;

  const boot = () => document.body.appendChild(root);
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);

  const $ = (role) => root.querySelector(`[data-role="${role}"]`);
  const launcher = root.querySelector(".svn-ai-launcher");
  const panel = root.querySelector(".svn-ai-panel");
  const body = $("body");
  const input = $("input");
  const sendBtn = root.querySelector('[data-act="send"]');
  /* ------------------------------------------------------------------ state */

  let meta = null;
  let history = [];
  let busy = false;
  const audio = new Audio(); // dedicated — never touches the app's #speechAudio
  let playingBtn = null;

  /* ------------------------------------------------------------- rendering */

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /** Minimal, safe markdown: escapes first, then re-introduces a tiny subset. */
  function md(text) {
    const lines = esc(text).split("\n");
    let out = "";
    let para = [];
    const flush = () => {
      if (para.length) {
        out += `<p>${para.join("<br>")}</p>`;
        para = [];
      }
    };
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        flush();
        continue;
      }
      const m = line.match(/^\s*[•\-\*]\s+(.*)$/);
      if (m) {
        flush();
        out += `<div class="svn-ai-li"><span>${m[1]}</span></div>`;
      } else {
        para.push(line);
      }
    }
    flush();
    return out
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(>])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[\s(>])_([^_\n]+)_/g, "$1<em>$2</em>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>");
  }

  function scrollDown() {
    requestAnimationFrame(() => {
      body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
    });
  }

  function addUser(text) {
    const el = document.createElement("div");
    el.className = "svn-ai-msg user";
    el.innerHTML = `<div class="svn-ai-bubble">${esc(text)}</div>`;
    body.appendChild(el);
    scrollDown();
  }

  function addBot(payload) {
    const el = document.createElement("div");
    el.className = "svn-ai-msg bot";

    if (payload.notice) {
      const n = document.createElement("div");
      n.className = "svn-ai-notice";
      n.textContent = payload.notice;
      el.appendChild(n);
    }

    if (payload.text) {
      const b = document.createElement("div");
      b.className = "svn-ai-bubble";
      b.innerHTML = md(payload.text);
      el.appendChild(b);
    }

    (payload.links || []).forEach((action) => {
      if (!/^\/(?:learn\/(?:\?sign=[^#]*)?|recognize\/|alerts\/|login|privacy\.html)$/.test(action.url)) return;
      const link = document.createElement("a");
      link.href = action.url;
      link.textContent = action.label + " →";
      el.appendChild(link);
    });

    if (payload.cards && payload.cards.length) {
      const wrap = document.createElement("div");
      wrap.className = "svn-ai-cards";
      payload.cards.forEach((c) => wrap.appendChild(buildCard(c)));
      el.appendChild(wrap);
    }

    if (payload.chips && payload.chips.length) {
      const chips = document.createElement("div");
      chips.className = "svn-ai-chips";
      payload.chips.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = c;
        b.addEventListener("click", () => ask(c));
        chips.appendChild(b);
      });
      el.appendChild(chips);
    }

    body.appendChild(el);
    scrollDown();
  }

  function buildCard(c) {
    const card = document.createElement("div");
    card.className = "svn-ai-card";

    const top = document.createElement("div");
    top.className = "svn-ai-card-top";

    const main = document.createElement("div");
    main.className = "svn-ai-card-main";
    main.innerHTML = `
      <div class="svn-ai-card-si">${esc(c.sinhala || c.label)}</div>
      ${c.english ? `<div class="svn-ai-card-en">${esc(c.english)}</div>` : ""}
      <div class="svn-ai-card-label">${esc(c.label)}</div>
      <span class="svn-ai-chip-cat">${esc(c.categoryLabel || "Sign")}</span>
    `;

    const speak = document.createElement("button");
    speak.type = "button";
    speak.className = "svn-ai-speak";
    speak.title = "Hear it in Sinhala";
    speak.setAttribute("aria-label", `Play pronunciation of ${c.sinhala || c.label}`);
    speak.innerHTML = ICON.speaker;
    speak.addEventListener("click", () => play(c.recognizeLabel, speak));

    top.appendChild(main);
    if (c.recognizeLabel && c.sinhala) top.appendChild(speak);
    card.appendChild(top);

    const coverage = document.createElement("p");
    coverage.textContent = c.recognizeLabel ? "Listed in Recognize" : "Not listed in Recognize";
    card.appendChild(coverage);
    if (c.units && c.units.length) {
      const units = document.createElement("p");
      units.textContent = "Learn: " + c.units.join(", ");
      card.appendChild(units);
    }
    if (c.learnUrl && /^\/learn\/\?sign=[^#]+$/.test(c.learnUrl)) {
      const learn = document.createElement("a");
      learn.href = c.learnUrl;
      learn.textContent = "Watch this sign in Learn →";
      card.appendChild(learn);
    } else {
      const missing = document.createElement("p");
      missing.textContent = "No exact-name recording in Learn";
      card.appendChild(missing);
    }

    if (c.tips && c.tips.length) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "svn-ai-tipbtn";
      toggle.innerHTML = `${ICON.chevron}<span>How to practise this sign</span>`;

      const tips = document.createElement("div");
      tips.className = "svn-ai-tips";
      c.tips.forEach((t) => {
        const d = document.createElement("div");
        d.innerHTML = `<span>${esc(t)}</span>`;
        tips.appendChild(d);
      });

      toggle.addEventListener("click", () => {
        const open = tips.classList.toggle("is-open");
        toggle.classList.toggle("is-open", open);
        scrollDown();
      });

      card.appendChild(toggle);
      card.appendChild(tips);
    }

    return card;
  }

  function play(label, btn) {
    try {
      if (playingBtn && playingBtn !== btn) playingBtn.classList.remove("is-playing");
      audio.pause();
      audio.src = `${API.speak}?text=${encodeURIComponent(label)}`;
      btn.classList.add("is-playing");
      playingBtn = btn;
      const done = () => btn.classList.remove("is-playing");
      audio.onended = done;
      audio.onerror = done;
      const p = audio.play();
      if (p && p.catch) p.catch(done);
    } catch (_) {
      btn.classList.remove("is-playing");
    }
  }

  function showTyping() {
    const t = document.createElement("div");
    t.className = "svn-ai-typing";
    t.dataset.typing = "1";
    t.innerHTML = "<i></i><i></i><i></i>";
    body.appendChild(t);
    scrollDown();
    return t;
  }

  /* ---------------------------------------------------------------- talking */

  async function ask(text) {
    const message = (text || "").trim();
    if (!message || busy) return;

    busy = true;
    input.value = "";
    autosize();
    sendBtn.disabled = true;
    addUser(message);

    const typing = showTyping();

    let payload;
    try {
      const res = await fetch(API.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(-8),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      payload = await res.json();
    } catch (err) {
      payload = {
        text: "I couldn't reach the app server. Make sure the Suvana server is still running, then try again.",
        cards: [],
        chips: [],
      };
    }

    typing.remove();
    addBot(payload);

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: payload.text || "" });
    if (history.length > 16) history = history.slice(-16);

    busy = false;
    sendBtn.disabled = !input.value.trim();
  }

  /* ------------------------------------------------------------------ input */

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 104) + "px";
  }

  input.addEventListener("input", () => {
    autosize();
    sendBtn.disabled = !input.value.trim() || busy;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input.value);
    }
  });

  sendBtn.addEventListener("click", () => ask(input.value));

  /* ----------------------------------------------------------- open / close */

  function open() {
    root.classList.add("is-open");
    if (!body.children.length) greet();
    setTimeout(() => input.focus(), 340);
  }

  function close() {
    root.classList.remove("is-open");
  }

  launcher.addEventListener("click", open);

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || !root.contains(btn)) return;
    const act = btn.dataset.act;
    if (act === "close") close();
    if (act === "clear") {
      body.innerHTML = "";
      history = [];
      greet();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) {
      close();
    }
  });

  /* -------------------------------------------------------------- greeting */

  function greet() {
    if (meta?.greeting) { addBot(meta.greeting); return; }
    const count = meta?.signCount;
    addBot({
      text:
        `ආයුබෝවන් 👋 I'm **Suvana AI**, your built-in practice assistant.\n\n` +
        (count
          ? `The shared index has **${count}** names from Learn and Recognize. Ask for a sign recording or platform help.`
          : `Ask me to look up label metadata or browse reference recordings in Learn.`),
      cards: [],
      chips: meta?.starters || [
        "How do I sign 'to eat'?",
        "Show me the letters",
        "Teach me a random sign",
      ],
    });
  }

  /* ------------------------------------------------------------------- init */

  fetch(API.meta)
    .then((r) => r.json())
    .then((data) => { meta = data; })
    .catch(() => { /* greeting works without metadata */ });
})();
