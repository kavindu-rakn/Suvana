"use client";

import { useState } from "react";
import { Database, Download, Copy, Check, AlertTriangle, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface SpeakerRow {
  speaker: string;
  total: number;
  gender: string;
  byEmotion: Record<string, number>;
}

export function DatasetClient({
  error,
  total,
  perSpeaker,
  emotions,
  sentenceCount,
  takesPerSpeaker,
  quiet,
  clipped,
}: {
  error: string | null;
  total: number;
  perSpeaker: SpeakerRow[];
  emotions: string[];
  sentenceCount: number;
  takesPerSpeaker: number;
  quiet: number;
  clipped: number;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/contribute` : "/contribute";

  function copy(text: string, what: string) {
    void navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  }

  // Five speakers is the point where leave-one-speaker-out stops being a
  // two-fold coin toss and starts being a result worth reporting.
  const enough = perSpeaker.length >= 3;
  const good = perSpeaker.length >= 5;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Database className="text-accent" size={24} />
          Emotion dataset
        </h1>
        <p className="mt-1 text-foreground-muted">
          Recordings contributed through the public link, ready to train on.
        </p>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-md border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {/* ── share link ── */}
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Link2 size={15} className="text-accent" />
          Share this link
        </h2>
        <p className="mt-1 text-[13px] text-foreground-muted">
          Anyone with the link can record — no account needed. Each browser is treated as
          one speaker, so ask each person to use their own device.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-sm">
            {shareUrl}
          </code>
          <Button variant="outline" size="md" onClick={() => copy(shareUrl, "link")}>
            {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
            {copied === "link" ? "Copied" : "Copy"}
          </Button>
        </div>
      </Card>

      {/* ── progress ── */}
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">
            {total} recording{total === 1 ? "" : "s"} from {perSpeaker.length} speaker
            {perSpeaker.length === 1 ? "" : "s"}
          </h2>
          <span
            className={`text-xs ${good ? "text-accent" : enough ? "text-yellow-400" : "text-foreground-muted"}`}
          >
            {good
              ? "Enough speakers for a solid result"
              : enough
                ? `Trainable — ${5 - perSpeaker.length} more speaker(s) would make it solid`
                : `Need at least ${3 - perSpeaker.length} more speaker(s) before training`}
          </span>
        </div>

        {perSpeaker.length === 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">
            Nothing recorded yet. Share the link above to get started.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-foreground-muted">
                  <th className="pb-2 pr-4 font-medium">Speaker</th>
                  {emotions.map((e) => (
                    <th key={e} className="pb-2 pr-4 font-medium">{e}</th>
                  ))}
                  <th className="pb-2 pr-4 font-medium">total</th>
                  <th className="pb-2 font-medium">progress</th>
                </tr>
              </thead>
              <tbody>
                {perSpeaker.map((row) => (
                  <tr key={row.speaker} className="border-t border-border">
                    <td className="py-2 pr-4 font-mono">spk{row.speaker}</td>
                    {emotions.map((e) => (
                      <td
                        key={e}
                        className={`py-2 pr-4 ${row.byEmotion[e] === sentenceCount ? "text-accent" : "text-foreground-muted"}`}
                      >
                        {row.byEmotion[e]}/{sentenceCount}
                      </td>
                    ))}
                    <td className="py-2 pr-4">{row.total}</td>
                    <td className="py-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${Math.round((row.total / takesPerSpeaker) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(quiet > 0 || clipped > 0) && (
          <p className="mt-4 flex items-start gap-2 rounded-md border border-yellow-400/30 bg-yellow-400/5 p-3 text-xs text-yellow-200/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              {quiet > 0 && <>{quiet} near-silent take{quiet === 1 ? "" : "s"}. </>}
              {clipped > 0 && <>{clipped} clipped take{clipped === 1 ? "" : "s"}. </>}
              Export with a peak filter below to leave them out — silent clips distort the
              energy features badly.
            </span>
          </p>
        )}
      </Card>

      {/* ── export ── */}
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Download size={15} className="text-accent" />
          Export for training
        </h2>
        <p className="mt-1 text-[13px] text-foreground-muted">
          Downloads a manifest listing every recording and its URL. Upload it to Colab and
          the notebook fetches the audio from there.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/contribute/export?minPeak=0.03" download>
            <Button size="md" disabled={total === 0}>
              <Download size={15} />
              Download manifest
            </Button>
          </a>
          <a href="/api/contribute/export" download>
            <Button variant="outline" size="md" disabled={total === 0}>
              Include quiet takes
            </Button>
          </a>
        </div>

        <p className="mt-4 text-xs uppercase tracking-wider text-foreground-muted">
          Then, in the training notebook
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
{`# upload emotion_dataset_manifest.json, then:
import json, os, urllib.request
m = json.load(open("/content/emotion_dataset_manifest.json"))
os.makedirs("/content/emotion_data", exist_ok=True)
for i, s in enumerate(m["samples"], 1):
    urllib.request.urlretrieve(s["url"], "/content/emotion_data/" + s["fileName"])
    if i % 25 == 0: print(f"{i}/{len(m['samples'])}")
print("done:", m["totals"])`}
        </pre>
        <Button
          variant="outline"
          size="md"
          className="mt-2"
          onClick={() =>
            copy(
              `import json, os, urllib.request\nm = json.load(open("/content/emotion_dataset_manifest.json"))\nos.makedirs("/content/emotion_data", exist_ok=True)\nfor i, s in enumerate(m["samples"], 1):\n    urllib.request.urlretrieve(s["url"], "/content/emotion_data/" + s["fileName"])\n    if i % 25 == 0: print(f"{i}/{len(m['samples'])}")\nprint("done:", m["totals"])`,
              "code"
            )
          }
        >
          {copied === "code" ? <Check size={15} /> : <Copy size={15} />}
          {copied === "code" ? "Copied" : "Copy code"}
        </Button>
      </Card>
    </div>
  );
}
