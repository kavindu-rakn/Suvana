"use client";

import { useRef } from "react";
import { UploadCloud } from "lucide-react";

export function AudioFilePicker({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (blob: Blob, filename: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file, file.name);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border text-foreground-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        <UploadCloud size={26} />
      </button>
      <p className="font-mono text-sm text-foreground-muted">Click to choose an audio file</p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
