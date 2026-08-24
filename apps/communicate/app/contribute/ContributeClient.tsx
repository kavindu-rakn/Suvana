"use client";

import { apiPath } from "@/lib/basePath";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Check, RotateCcw, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import {
  SENTENCES,
  EMOTIONS,
  DIRECTION,
  TOTAL_TAKES,
  type Emotion,
} from "@/lib/data/recordingScript";
import { encodeWav, recordTake, type Take } from "./recorder";

const STORAGE_KEY = "signspeak.contribute.speakerKey";
const SECONDS = 4;

type Phase = "intro" | "record" | "done";
type Slot = { sentenceIndex: number; emotion: Emotion };

/**
 * How many sentences to record in one emotion before switching.
 *
 * Small blocks first, then larger ones. The early blocks exist so that a
 * complete set of all four emotions is banked within the first couple of
 * minutes — a contributor who gives up after eight takes has still produced
 * something trainable. Later blocks grow to five because switching mood every
 * take is tiring, and a half-hearted angry is worse than no angry.
 */
function blockSizes(total: number): number[] {
  const sizes: number[] = [];
  let left = total;
  for (const size of [2, 3]) {
    if (left <= 0) break;
    const take = Math.min(size, left);
    sizes.push(take);
    left -= take;
  }
  while (left > 0) {
    const take = Math.min(5, left);
    sizes.push(take);
    left -= take;
  }
  return sizes;
}

/**
 * Running order: small blocks of one emotion, cycling through all four, then
 * on to the next group of sentences.
 *
 *   s1-s5 neutral, s1-s5 happy, s1-s5 sad, s1-s5 angry,
 *   s6-s10 neutral, s6-s10 happy, ...
 *
 * The obvious alternative — all twenty neutral, then all twenty happy — is
 * easier to perform, and wrong for two reasons.
 *
 * Most contributors will not finish. Eighty takes is around twenty-five
 * minutes and people get interrupted. With emotion-blocked ordering someone
 * who stops halfway has recorded every neutral and happy take and *no* sad or
 * angry ones, which is unusable: the classifier needs all four classes from a
 * speaker or that speaker cannot be a fold. Cycling in small blocks means
 * whatever fraction someone completes is balanced across emotions and can go
 * straight into training.
 *
 * It also breaks a confound. Voices tire, people shift in their seat, rooms
 * get noisier. Over a long session that drift is real — and under blocked
 * ordering it lines up exactly with emotion, so the model can learn "recorded
 * later" and score well for entirely the wrong reason. Spreading each emotion
 * across the whole session turns that drift into noise instead of signal.
 *
 * Block sizes ramp up — see blockSizes() — so the first full set of four
 * emotions is complete after eight takes rather than twenty.
 */
function buildQueue(): Slot[] {
  const queue: Slot[] = [];
  let start = 0;
  for (const size of blockSizes(SENTENCES.length)) {
    for (const emotion of EMOTIONS) {
      for (let i = start; i < start + size; i++) {
        queue.push({ sentenceIndex: i, emotion });
      }
    }
    start += size;
  }
  return queue;
}

function newSpeakerKey(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ContributeClient() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [speakerKey, setSpeakerKey] = useState<string>("");
  const [speakerNo, setSpeakerNo] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [gender, setGender] = useState("unspecified");
  const [ageBand, setAgeBand] = useState("");

  const queue = useMemo(() => buildQueue(), []);
  const [at, setAt] = useState(0);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "counting" | "recording" | "review" | "saving">("idle");
  const [countdown, setCountdown] = useState(0);
  const [pending, setPending] = useState<Take | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const slot = queue[at];
  const sentence = slot ? SENTENCES[slot.sentenceIndex] : null;
  const direction = slot ? DIRECTION[slot.emotion] : null;
  const key = slot ? `${sentence!.id}:${slot.emotion}` : "";

  // Resume: the browser remembers who it is, so closing the tab mid-session
  // is not a lost session. 80 takes is a long sitting and people will stop
  // partway — partial contributions are still worth having.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = newSpeakerKey();
        localStorage.setItem(STORAGE_KEY, stored);
      }

      // Progress is fetched before any state is set, so the whole restore
      // lands in one render rather than flashing an empty session first.
      let progress: { speakerNo?: string; done?: { sentenceId: string; emotion: string }[] } | null = null;
      try {
        const res = await fetch(apiPath(`/api/contribute?speakerKey=${stored}`));
        if (res.ok) progress = await res.json();
      } catch {
        // Offline or the API is down — start fresh rather than blocking.
      }
      if (cancelled) return;

      setSpeakerKey(stored);
      if (progress?.done) {
        setSpeakerNo(progress.speakerNo ?? null);
        setDoneKeys(new Set(progress.done.map((d) => `${d.sentenceId}:${d.emotion}`)));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Skip to the first slot that has no recording yet.
  const advance = useCallback((from: number, filled: Set<string>) => {
    for (let i = from; i < queue.length; i++) {
      const s = queue[i];
      if (!filled.has(`${SENTENCES[s.sentenceIndex].id}:${s.emotion}`)) return i;
    }
    return queue.length;
  }, [queue]);

  async function handleRecord() {
    setError(null);
    setPending(null);
    try {
      const take = await recordTake({
        seconds: SECONDS,
        countdown: 3,
        onCountdown: (n) => { setStatus("counting"); setCountdown(n); },
        onRecording: (left) => { setStatus("recording"); setCountdown(left); },
      });
      setPending(take);
      setStatus("review");
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(
          new Blob([encodeWav(take.pcm, take.sampleRate)], { type: "audio/wav" })
        );
      }
    } catch (e) {
      setStatus("idle");
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone blocked. Allow it using the icon in the address bar, then try again."
          : "Could not record. Check that a microphone is connected."
      );
    }
  }

  async function handleKeep() {
    if (!pending || !slot || !sentence) return;
    setStatus("saving");
    setError(null);
    try {
      const wav = encodeWav(pending.pcm, pending.sampleRate);
      const form = new FormData();
      form.append("audio", new Blob([wav], { type: "audio/wav" }), "take.wav");
      form.append("speakerKey", speakerKey);
      form.append("sentenceId", sentence.id);
      form.append("emotion", slot.emotion);
      form.append("durationSec", String(pending.pcm.length / pending.sampleRate));
      form.append("peak", String(pending.peak));
      form.append("gender", gender);
      form.append("ageBand", ageBand);
      form.append("consent", "true");

      const res = await fetch(apiPath("/api/contribute"), { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");

      setSpeakerNo(data.speakerNo);
      const filled = new Set(doneKeys).add(key);
      setDoneKeys(filled);
      setPending(null);
      setStatus("idle");

      const next = advance(at + 1, filled);
      if (next >= queue.length) setPhase("done");
      else setAt(next);
    } catch (e) {
      setStatus("review");
      setError(e instanceof Error ? e.message : "Upload failed. Check your connection.");
    }
  }

  const completed = doneKeys.size;
  const pct = Math.round((completed / TOTAL_TAKES) * 100);

  /* ─────────────────────────── intro ─────────────────────────── */
  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Help build a Sinhala emotion dataset</h1>
        <p className="mt-2 text-foreground-muted">
          This is for a university research project that turns Sinhala speech into sign
          language. We need recordings of the same sentences said in four different
          moods, so a computer can learn to tell them apart.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-background-elevated p-5">
          <h2 className="text-sm font-medium">What you will do</h2>
          <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
            <li>Read {SENTENCES.length} short Sinhala sentences aloud.</li>
            <li>Say each one four times — neutral, happy, sad and angry.</li>
            <li>Each take is {SECONDS} seconds. About 20–25 minutes in total.</li>
            <li>
              You can stop at any point and come back later — this browser remembers
              where you were. <span className="text-foreground">Partial recordings are still useful.</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background-elevated p-5">
          <h2 className="text-sm font-medium">Before you start</h2>
          <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
            <li><span className="text-foreground">Find a quiet room.</span> Close the window, turn off any fan.</li>
            <li><span className="text-foreground">Stay the same distance from the microphone</span> for every take. This matters more than the microphone quality.</li>
            <li><span className="text-foreground">Do it in one sitting if you can.</span> Recording half today and half tomorrow makes the data less useful.</li>
            <li><span className="text-foreground">Exaggerate.</span> Push each mood further than feels natural — a polite, restrained performance cannot be told apart from a flat one.</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-background-elevated p-5">
          <h2 className="text-sm font-medium">About your recordings</h2>
          <div className="mt-3 space-y-2 text-sm text-foreground-muted">
            <p>
              Your voice recordings will be used only to train and evaluate the emotion
              model for this research project, and to report results such as accuracy.
            </p>
            <p>
              We do not ask for your name, email address or any contact details, and none
              are stored. Recordings are kept under a random identifier held in this
              browser.
            </p>
            <p>
              Taking part is voluntary and you can stop at any time. If you later want
              your recordings removed, send the code shown at the end of the session to
              the researcher.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-foreground-muted">Gender (optional)</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="unspecified">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-foreground-muted">Age range (optional)</span>
              <select
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Prefer not to say</option>
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-49">35–49</option>
                <option value="50+">50+</option>
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            Only used to describe who the dataset covers. Leave both blank if you prefer.
          </p>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <span>
              I am 18 or over, I have read the above, and I agree to my voice recordings
              being used for this research project.
            </span>
          </label>
        </div>

        {completed > 0 && (
          <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            Welcome back — you have {completed} of {TOTAL_TAKES} recorded. You will carry
            on where you left off.
          </p>
        )}

        <button
          disabled={!consent}
          onClick={() => { setPhase("record"); setAt(advance(0, doneKeys)); }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-medium text-white disabled:opacity-40 sm:w-auto"
        >
          <Mic size={18} />
          {completed > 0 ? "Continue recording" : "Start recording"}
        </button>
      </main>
    );
  }

  /* ─────────────────────────── done ─────────────────────────── */
  if (phase === "done" || !slot || !sentence || !direction) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <Check className="mx-auto text-accent" size={44} />
        <h1 className="mt-4 text-2xl font-semibold">Thank you</h1>
        <p className="mt-2 text-foreground-muted">
          You recorded {completed} of {TOTAL_TAKES} takes. Every one helps.
        </p>
        <div className="mx-auto mt-6 max-w-sm rounded-xl border border-border bg-background-elevated p-5 text-left">
          <p className="text-xs uppercase tracking-wider text-foreground-muted">Your code</p>
          <p className="mt-1 break-all font-mono text-sm">
            {speakerNo ? `Speaker ${speakerNo}` : "—"}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-foreground-muted">{speakerKey}</p>
          <p className="mt-3 text-xs text-foreground-muted">
            Keep this only if you might want your recordings removed later. It is not
            needed for anything else.
          </p>
        </div>
        {completed < TOTAL_TAKES && (
          <button
            onClick={() => { setPhase("record"); setAt(advance(0, doneKeys)); }}
            className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm"
          >
            Record the remaining {TOTAL_TAKES - completed}
          </button>
        )}
      </main>
    );
  }

  /* ─────────────────────────── recording ─────────────────────────── */
  const busy = status === "counting" || status === "recording" || status === "saving";

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      {/* progress */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background-elevated">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs text-foreground-muted">
          {completed} / {TOTAL_TAKES}
        </span>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_320px]">
        {/* ── left: how to say it ── */}
        <section className="order-2 rounded-xl border border-border bg-background-elevated p-5 md:order-1">
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: direction.color }}
          >
            {direction.label} — {direction.short}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
            {direction.how.map((line) => (
              <li key={line} className="flex gap-2">
                <ChevronRight size={15} className="mt-0.5 shrink-0 opacity-50" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-2 rounded-md border border-yellow-400/30 bg-yellow-400/5 p-2.5 text-xs text-yellow-200/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {direction.avoid}
          </p>
        </section>

        {/* ── right: the sentence and the button ── */}
        <section className="order-1 rounded-xl border border-border bg-background-elevated p-5 text-center md:order-2">
          <p className="text-xs uppercase tracking-wider text-foreground-muted">
            Sentence {slot.sentenceIndex + 1} of {SENTENCES.length}
          </p>
          <p className="mt-3 text-2xl leading-snug" lang="si">
            {sentence.si}
          </p>
          <p className="mt-1.5 text-xs text-foreground-muted">{sentence.en}</p>

          <div
            className="mt-5 flex h-16 items-center justify-center text-3xl font-bold"
            style={{
              color:
                status === "recording" ? "#34a853" :
                status === "counting" ? "#f4b400" : undefined,
            }}
          >
            {status === "counting" && `Get ready… ${countdown}`}
            {status === "recording" && `SPEAK  (${countdown})`}
            {status === "review" && <span className="text-base font-normal text-foreground-muted">Listen back</span>}
            {status === "saving" && <Loader2 className="animate-spin text-accent" size={28} />}
            {status === "idle" && <span className="text-base font-normal text-foreground-muted">Ready</span>}
          </div>

          <audio ref={audioRef} controls className={status === "review" ? "w-full" : "hidden"} />

          {pending && status === "review" && pending.peak < 0.03 && (
            <p className="mt-2 text-xs text-red-300">
              Very quiet — almost nothing was picked up. Move closer and record again.
            </p>
          )}
          {pending && status === "review" && pending.peak > 0.99 && (
            <p className="mt-2 text-xs text-yellow-300">
              Too loud, the sound is distorting. Move back and record again.
            </p>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {status !== "review" && (
              <button
                onClick={handleRecord}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                <Mic size={16} /> Record
              </button>
            )}
            {status === "review" && (
              <>
                <button
                  onClick={handleKeep}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white"
                >
                  <Check size={16} /> Keep
                </button>
                <button
                  onClick={handleRecord}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"
                >
                  <RotateCcw size={16} /> Again
                </button>
              </>
            )}
            {!busy && (
              <button
                onClick={() => {
                  const next = advance(at + 1, doneKeys);
                  if (next >= queue.length) setPhase("done");
                  else { setAt(next); setPending(null); setStatus("idle"); }
                }}
                className="rounded-lg px-4 py-2.5 text-sm text-foreground-muted hover:text-foreground"
              >
                Skip
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-2.5 text-xs text-red-300">
              {error}
            </p>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-foreground-muted">
            Three ticks, then a <span className="text-foreground">high beep</span> means
            start. A <span className="text-foreground">low beep</span> means stop.
          </p>
        </section>
      </div>
    </main>
  );
}
