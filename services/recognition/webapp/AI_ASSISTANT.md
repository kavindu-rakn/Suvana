# සවන AI Assistant

A built-in sign-language tutor for the web app. It costs nothing to run, needs
no account, and works with no internet connection.

## What was added

| File | Status | Purpose |
|---|---|---|
| `webapp/assistant.py` | **new** | Local knowledge engine + optional LLM proxy, exposed as a FastAPI router |
| `webapp/static/assistant.css` | **new** | Widget styling (every selector namespaced `.svn-ai*`) |
| `webapp/static/assistant.js` | **new** | Self-injecting chat widget |
| `webapp/server.py` | +16 lines | Includes the assistant router (wrapped in `try/except`) |
| `webapp/static/index.html` | +4 lines | One `<link>`, one `<script>` |

No existing line of code was modified. Delete the three new files and the four
added lines and the app is byte-for-byte what it was before.

## How it answers

**Offline engine (default, always on).** A retrieval + intent engine built over
`webapp/data/sinhala_labels.json` — the app's own label data. It handles sign
lookup by English meaning, Romanised Sinhala or Sinhala script, fuzzy-matches
typos, browses by category, and returns practice guidance. It runs entirely in
process: no key, no network, no quota, no cost.

A relevance floor (`SignKnowledgeBase.MIN_SCORE`) means an unrelated question
gets an honest "that isn't in this dataset" rather than a confidently wrong
sign — important for a teaching tool.

**Optional cloud model (free tier).** Open the assistant → gear icon → pick a
provider and paste a free API key:

| Provider | Free key | No credit card |
|---|---|---|
| Google Gemini | https://aistudio.google.com/app/apikey | yes |
| Groq | https://console.groq.com/keys | yes |
| OpenRouter | https://openrouter.ai/keys | yes |

The key lives in the browser's `localStorage` and is forwarded per request; the
server never writes it to disk.

When a key is set the flow becomes retrieval-augmented: the local engine
retrieves the relevant signs first and injects them into the system prompt, so
the model answers from this project's actual dataset. If the key is invalid,
rate-limited or the machine is offline, the request falls back to the local
answer and shows a small notice — the assistant never hard-fails.

## API surface

All routes are namespaced under `/api/assistant`, so they cannot collide with
the existing `/api/info`, `/api/labels`, `/api/speak` or `/ws/recognize`.

- `GET  /api/assistant/meta` — dataset counts, provider list, starter prompts
- `POST /api/assistant/chat` — `{message, history, provider, apiKey, model}`
- `POST /api/assistant/verify` — validates a pasted key without spending a turn

Audio playback reuses the existing `/api/speak` endpoint and its gTTS cache, via
a dedicated `Audio()` instance so it cannot interfere with recognition speech.

## Running

Unchanged:

```bash
.venv\Scripts\python.exe -m uvicorn webapp.server:app --host 127.0.0.1 --port 8000
```

On startup you should see `AI assistant mounted at /api/assistant`. If the
module ever fails to import, the server prints a warning and starts normally
without the assistant.
