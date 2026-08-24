"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioRecorder({
  onRecordingComplete,
  disabled,
}: {
  onRecordingComplete: (blob: Blob, filename: string) => void;
  disabled?: boolean;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      // The browser's voice-call processing is off on purpose. Automatic gain
      // control, noise suppression and echo cancellation are all designed to
      // make speech *uniform* — they compress loudness and smooth spectral
      // detail. The emotion classifier reads exactly those cues (how much the
      // energy varies, how sharp the attacks are), so leaving them on would
      // strip the signal before it ever reaches the model.
      //
      // Transcription is unaffected: Whisper is robust to raw input.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          noiseSuppression: false,
          echoCancellation: false,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        onRecordingComplete(blob, `recording-${Date.now()}.webm`);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setError("Microphone access was denied or is unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <button
        type="button"
        disabled={disabled}
        onClick={isRecording ? stopRecording : startRecording}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all disabled:opacity-50 ${
          isRecording
            ? "border-red-400 bg-red-400/10 text-red-400"
            : "border-accent bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={26} />}
        {isRecording && (
          <span className="absolute h-24 w-24 animate-ping rounded-full bg-red-400/20" />
        )}
      </button>

      <p className="font-mono text-sm text-foreground-muted">
        {isRecording ? `Recording… ${formatTime(elapsed)}` : "Tap to record"}
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {isRecording && (
        <Button variant="outline" size="md" onClick={stopRecording} type="button">
          Stop recording
        </Button>
      )}
    </div>
  );
}
