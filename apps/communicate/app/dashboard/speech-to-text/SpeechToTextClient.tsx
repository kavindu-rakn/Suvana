"use client";

import { useState } from "react";
import { Loader2, AudioLines } from "lucide-react";
import { AudioInputPanel } from "@/components/audio/AudioInputPanel";
import { TranscriptionResult, type TranscriptionData } from "@/components/stt/TranscriptionResult";
import { Button } from "@/components/ui/Button";

export function SpeechToTextClient() {
  const [audio, setAudio] = useState<{ blob: Blob; filename: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionData | null>(null);

  async function handleTranscribe() {
    if (!audio) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("audio", audio.blob, audio.filename);

      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong while transcribing.");
        return;
      }

      setResult(data);

      // Best-effort save to history; failures here shouldn't block the UI.
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioText: data.text,
          emotion: data.emotion,
          confidence: data.confidence,
        }),
      }).catch(() => {});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <AudioLines className="text-accent" size={24} />
          Speech to Text
        </h1>
        <p className="mt-1 text-foreground-muted">
          Record or upload audio to get a transcript and detected emotion.
        </p>
      </div>

      <AudioInputPanel
        disabled={loading}
        onAudioReady={(blob, filename) => {
          setResult(null);
          setError(null);
          setAudio(blob ? { blob, filename } : null);
        }}
      />

      <Button
        size="lg"
        disabled={!audio || loading}
        onClick={handleTranscribe}
        className="w-full sm:w-fit"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Transcribing…
          </>
        ) : (
          "Transcribe audio"
        )}
      </Button>

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && <TranscriptionResult result={result} />}
    </div>
  );
}
