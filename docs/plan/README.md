# docs/plan: the 12-22 Oct 2026 plan for Suvana

This folder is the shared plan for finishing Suvana (SLIIT IT4010 project R26-SE-019, kvn = Ranathunga R A K N, IT22552860) before the final thesis and final demo on about **22 Oct 2026**, with everything **demo-ready by 21 Oct**. It was written on 12 Oct 2026 (evening) from six audits (learnability, bugs, market, integration, infra, agents) and one hostile review.

Three AI tools work in parallel with kvn: **Claude Code**, **OpenAI Codex** and **Google Antigravity**. Every document here stands alone: an agent with no conversation history must be able to pick up a task from these files.

## Reading order (every agent, every session)

1. `00-mission.md`: goals, deadlines, kvn's decisions, hard rules, definition of done.
2. `08-agent-protocol.md`: how you work: worktree, branch, gates, handoff, what you never do.
3. `BOARD.md` (or `tasks.json`): find **your** tasks for **today** (owner = your tool, day = today).
4. `DECISIONS.md`: check every decision your task lists. If one is still open, do only the parts it does not affect and ask kvn.
5. `01-state.md`: the honest baseline. Do not repeat a fact from memory if it is here.
6. The spec for your area:
   - Learn: `02-learn-vision.md`, then `03-learn-spec.md`, then `04-bugs.md`.
   - Integration, shell, Communicate, Recognize, Alerts, speech: `05-integration.md`.
   - Deployment and CI: `06-deploy.md`.
   - Porting Learn to the R26 repo: `07-r26-mirror.md`.
   - Thesis: `09-thesis-final.md`.
7. `10-schedule.md` (who owns which hot file today) and `11-risks.md`.
8. The last few entries of `LOG.md`.

## How to pick and claim a task

- Tasks are **pre-assigned**: each row in `BOARD.md` has an owner tool and a day. Work only on tasks assigned to your tool, in the order the schedule gives, after their dependencies are merged into `main` (or are an earlier task of yours you stacked on, see 08 section 4).
- Claiming = starting: create the branch named in the board row and write the first line of your handoff file (`docs/plan/handoffs/<ID>.md`, "started <time>").
- To take a task owned by **another** tool (for example because that tool hit its usage limit), kvn must say so in chat. kvn then changes the owner in `BOARD.md`/`tasks.json`.
- Agents never edit `BOARD.md`, `tasks.json` or `DECISIONS.md`; kvn does, during the daily merge.

## Where to log handoffs

- Each task gets its own file on your branch: `docs/plan/handoffs/<ID>.md` (template in 08 section 8). One file per task means no merge conflicts.
- When you finish (or stop, or get blocked), also append **one entry** to `LOG.md` using its template. `LOG.md` is append-only; Q-02 marks it `merge=union` so parallel appends merge cleanly.

## Hard rules in brief (full text: 00-mission.md section 5 and 08-agent-protocol.md section 2)

1. Never invent SSL content: no glosses, meanings, Sinhala translations, sign or gloss order, handshape, location or movement descriptions. Content comes from the public corpora, Lithira's mapper, kvn, or real signers.
2. Never invent or misquote figures. 74.6% is always quoted with its 65.4% majority-class baseline. Never quote recognition accuracy (98.78%). No participants exist.
3. UI changes are adopted by kvn only from rendered before/after screenshots, desktop and phone.
4. Licences: `kaggle_*` landmarks are CC0; `yohan_*` are CC BY-NC-SA 4.0 (non-commercial). Corpus **video** is not covered by either statement until kvn decides DN-05.
5. Datasets, clips, model binaries, `.env*` files and secrets never enter a repo. Integrate teammates at the HTTP/contract level; never regenerate Recognize's label files.
6. No sub-brands (Sawana, SignSpeak, SoundGuard) on any Suvana surface.
7. The uploaded draft thesis is never edited (editing it after 11 Oct costs 50% of the marks). The final thesis is a separate copy.
8. Agents may commit only on their own branch in their own worktree. They never commit to `main`, never push, merge, deploy, buy, or message anyone. In the R26 repo agents never commit.

## Files in this folder

| File | What it is |
|---|---|
| `00-mission.md` | Goals, deadlines, decisions of 12 Oct, scope, hard rules, definition of done |
| `01-state.md` | Honest state of every component, repo and deployment on 12 Oct, with evidence |
| `02-learn-vision.md` | What a great Suvana Learn is; competitors; unique claims; licensing stance |
| `03-learn-spec.md` | Feature specs with acceptance criteria, mapped to PP1/PP2 and proposal objectives |
| `04-bugs.md` | Consolidated bug list |
| `05-integration.md` | Topology, per-component plan, teammate asks, demo checklist |
| `06-deploy.md` | Ordered deployment steps, env vars, domain, CI |
| `07-r26-mirror.md` | Porting Learn to R26 and redeploying learn-ssl-module.vercel.app |
| `08-agent-protocol.md` | How the three tools work in parallel |
| `09-thesis-final.md` | Final-thesis checklist |
| `10-schedule.md` | Day-by-day lanes and hot-file owners |
| `11-risks.md` | Risks, mitigations, fallbacks |
| `BOARD.md`, `tasks.json` | All tasks (same data; tasks.json is the source) |
| `DECISIONS.md` | Decided and open decisions |
| `LOG.md` | Append-only handoff journal |
| `handoffs/` | Created by agents: one handoff file per task |

## Keeping this folder true

If you find a fact here that is wrong, do not work around it silently. Say so in your handoff ("Plan correction: ...") and in LOG.md; kvn fixes the plan on `main`.
