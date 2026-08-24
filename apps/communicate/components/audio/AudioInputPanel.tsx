"use client";

import { useEffect, useState } from "react";
import { Mic, UploadCloud, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AudioRecorder } from "./AudioRecorder";
import { AudioFilePicker } from "./AudioFilePicker";

type Mode = "record" | "upload";

export function AudioInputPanel({
  onAudioReady,
  disabled,
}: {
  onAudioReady: (blob: Blob | null, filename: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("record");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleAudio(blob: Blob, name: string) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setFilename(name);
    onAudioReady(blob, name);
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFilename(null);
    onAudioReady(null, "");
  }

  return (
    <Card className="p-6">
      {!previewUrl ? (
        <>
          <div className="flex gap-2 rounded-lg bg-background p-1">
            <button
              type="button"
              onClick={() => setMode("record")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm transition-colors ${
                mode === "record"
                  ? "bg-accent text-[#0a0a0a]"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Mic size={14} /> Record
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm transition-colors ${
                mode === "upload"
                  ? "bg-accent text-[#0a0a0a]"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <UploadCloud size={14} /> Upload
            </button>
          </div>

          {mode === "record" ? (
            <AudioRecorder onRecordingComplete={handleAudio} disabled={disabled} />
          ) : (
            <AudioFilePicker onFileSelected={handleAudio} disabled={disabled} />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="w-full truncate text-center text-sm text-foreground-muted">{filename}</p>
          <audio controls src={previewUrl} className="w-full" />
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-red-400 disabled:opacity-50"
          >
            <X size={14} /> Remove and choose another
          </button>
        </div>
      )}
    </Card>
  );
}
