"use client";

import { apiPath } from "@/lib/basePath";
import { useRef, useState } from "react";
import { Loader2, Box, Play, Square, RotateCcw } from "lucide-react";
import { AudioInputPanel } from "@/components/audio/AudioInputPanel";
import { TranscriptionResult, type TranscriptionData } from "@/components/stt/TranscriptionResult";
import { GlossSequenceList } from "@/components/gloss/GlossSequenceList";
import { AvatarViewer } from "@/components/three/AvatarViewer";
import { AVATARS, DEFAULT_AVATAR, type AvatarId } from "@/components/three/useQuickMagicModel";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  EMOTION_ORDER,
  EMOTION_STYLES,
  describeStyle,
  resolveEmotion,
  type EmotionLabel,
} from "@/lib/emotion/styles";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { GlossMatch } from "@/lib/nlp/matchers/types";

interface SttResult extends TranscriptionData {
  tokens: string[];
  glosses: string[];
  unknownTokens: string[];
}

export function SignModelClient() {
  const [audio, setAudio] = useState<{ blob: Blob; filename: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<SttResult | null>(null);
  const [matches, setMatches] = useState<GlossMatch[]>([]);
  const [unmatchedGlosses, setUnmatchedGlosses] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<{
    matchedVia?: string;
    dictionarySize?: number;
  } | null>(null);
  // The avatar is a local asset now, not a Cloudinary upload — see
  // components/three/SignAvatar.tsx.
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  /**
   * null = follow whatever the classifier detected; a value = manual override.
   * The override exists so the conditioning can be demonstrated and filmed
   * before a Sinhala-trained classifier is available.
   */
  const [emotionOverride, setEmotionOverride] = useState<EmotionLabel | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  // Reveal each result block as it appears rather than having the layout jump
  // — transcript, matches and viewer land in sequence.
  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        y: 16,
        opacity: 0,
        duration: 0.4,
        stagger: 0.07,
        ease: "power2.out",
      });
    },
    { scope: rootRef, dependencies: [transcription, matches.length] }
  );

  const detectedEmotion = resolveEmotion(transcription?.emotion);
  const activeEmotion: EmotionLabel = emotionOverride ?? detectedEmotion;

  async function handleTranslate() {
    if (!audio) return;
    setLoading(true);
    setError(null);
    setTranscription(null);
    setMatches([]);
    setUnmatchedGlosses([]);
    setDiagnostics(null);
    setPaused(false);

    try {
      const form = new FormData();
      form.append("audio", audio.blob, audio.filename);

      const sttRes = await fetch(apiPath("/api/stt"), { method: "POST", body: form });
      const sttData: SttResult = await sttRes.json();

      if (!sttRes.ok) {
        setError((sttData as unknown as { error?: string }).error ?? "Something went wrong while transcribing.");
        return;
      }
      if (!sttData.text?.trim()) {
        setError("No speech was detected in that audio. Try again.");
        return;
      }

      setTranscription(sttData);

      // Send raw Sinhala tokens so the server-side matcher handles inflection
      // and spelling variants. `glosses` is the legacy path for notebooks
      // still doing their own exact lookup; `text` is the last resort.
      const hasTokens = sttData.tokens && sttData.tokens.length > 0;
      const hasGlosses = sttData.glosses && sttData.glosses.length > 0;

      const glossRes = await fetch(apiPath("/api/gloss/predict"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens: hasTokens ? sttData.tokens : undefined,
          glosses: !hasTokens && hasGlosses ? sttData.glosses : undefined,
          text: !hasTokens && !hasGlosses ? sttData.text : undefined,
          emotion: sttData.emotion,
          confidence: sttData.confidence,
        }),
      });
      const glossData = await glossRes.json();

      if (!glossRes.ok) {
        setError(glossData.error ?? "Something went wrong while matching signs.");
        return;
      }

      setEmotionOverride(null);
      setMatches(glossData.matches ?? []);
      setUnmatchedGlosses(glossData.unmatchedGlosses ?? []);
      setDiagnostics({
        matchedVia: glossData.matchedVia,
        dictionarySize: glossData.dictionarySize,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Box className="text-accent" size={24} />
            Audio to Sign Model
          </h1>
          <p className="mt-1 text-foreground-muted">
            Record or upload audio and watch a 3D avatar sign it back to you.
          </p>
        </div>

        {/* Both avatars share one skeleton, so a stored sign plays on either. */}
        <fieldset className="flex items-center gap-1 rounded-md border border-border p-1">
          <legend className="sr-only">Avatar</legend>
          {(Object.keys(AVATARS) as AvatarId[]).map((id) => (
            <label
              key={id}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs transition-colors ${
                avatarId === id
                  ? "bg-accent/20 text-accent"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="sign-avatar"
                className="sr-only"
                checked={avatarId === id}
                onChange={() => setAvatarId(id)}
              />
              {AVATARS[id].label}
            </label>
          ))}
        </fieldset>
      </div>

      <AudioInputPanel
        disabled={loading}
        onAudioReady={(blob, filename) => {
          setError(null);
          setTranscription(null);
          setMatches([]);
          setUnmatchedGlosses([]);
          setAudio(blob ? { blob, filename } : null);
        }}
      />

      <Button
        size="lg"
        disabled={!audio || loading}
        onClick={handleTranslate}
        className="w-full sm:w-fit"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Translating…
          </>
        ) : (
          "Translate to sign language"
        )}
      </Button>

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {transcription && (
        <div data-reveal>
          <TranscriptionResult result={transcription} />
        </div>
      )}

      {transcription && transcription.unknownTokens.length > 0 && (
        <p className="text-sm text-foreground-muted">
          {transcription.unknownTokens.length} word(s) were dropped by the notebook before
          matching: <span className="text-accent">{transcription.unknownTokens.join(", ")}</span>{" "}
          — update the notebook so it returns raw tokens instead.
        </p>
      )}

      {matches.length > 0 && (
        <div data-reveal className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider text-foreground-muted">
              Matched signs
            </span>
            <GlossSequenceList matches={matches} />
          </div>
          <div className="flex flex-col gap-3">
            <AvatarViewer
              avatarId={avatarId}
              glossQueue={matches}
              emotion={activeEmotion}
              queuePaused={paused}
              queueRestartKey={restartKey}
              onQueueComplete={() => setPaused(true)}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-foreground-muted">
                Emotion
              </span>
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-1.5">
                <Select
                  compact
                  aria-label="Emotion"
                  value={activeEmotion}
                  onChange={(e) => {
                    setEmotionOverride(e.target.value as EmotionLabel);
                    // Replay from the first sign so the new delivery is seen
                    // whole, rather than starting mid-sequence.
                    setPaused(false);
                    setRestartKey((k) => k + 1);
                  }}
                  title={describeStyle(activeEmotion)}
                >
                  {EMOTION_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {EMOTION_STYLES[id].label}
                    </option>
                  ))}
                </Select>
                {emotionOverride && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmotionOverride(null);
                      setPaused(false);
                      setRestartKey((k) => k + 1);
                    }}
                    className="text-[11px] text-foreground-muted underline-offset-2 transition-colors hover:text-accent hover:underline"
                  >
                    use detected
                  </button>
                )}
              </div>
              <p className="text-[11px] text-foreground-muted">
                {emotionOverride
                  ? `Manual override · detected was "${detectedEmotion}" · ${describeStyle(activeEmotion)}`
                  : `Detected from audio · ${describeStyle(activeEmotion)}`}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="md" onClick={() => setPaused(false)}>
                <Play size={16} />
                Play
              </Button>
              <Button variant="outline" size="md" onClick={() => setPaused(true)}>
                <Square size={16} />
                Stop
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setPaused(false);
                  setRestartKey((k) => k + 1);
                }}
              >
                <RotateCcw size={16} />
                Restart
              </Button>
            </div>
          </div>
        </div>
      )}

      {transcription && unmatchedGlosses.length > 0 && (
        <div data-reveal className="rounded-md border border-border p-4 text-sm">
          <p className="text-foreground-muted">
            No sign registered for:{" "}
            <span className="font-medium text-accent">{unmatchedGlosses.join(", ")}</span>
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-foreground-muted">
            Add the word as a <span className="text-foreground">synonym</span> on the matching
            gloss in <span className="text-accent">Dashboard → Animations</span>. Spelling
            variants and Sinhala word endings are handled automatically, so you only need the
            base word.
          </p>
          {diagnostics?.dictionarySize !== undefined && (
            <p className="mt-2 text-[11px] text-foreground-muted/70">
              Searched {diagnostics.dictionarySize} registered sign
              {diagnostics.dictionarySize === 1 ? "" : "s"}
              {diagnostics.matchedVia ? ` · input: ${diagnostics.matchedVia}` : ""}
            </p>
          )}
        </div>
      )}

      {transcription && matches.length === 0 && unmatchedGlosses.length === 0 && !error && (
        <p className="text-sm text-foreground-muted">
          Nothing was matched, and nothing was reported as unmatched — the transcript may have
          been empty.
          {diagnostics?.matchedVia ? ` (input: ${diagnostics.matchedVia})` : ""}
        </p>
      )}
    </div>
  );
}
