import type { HTMLAttributes } from "react";

const EMOTION_STYLES: Record<string, string> = {
  happy: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  sad: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  angry: "bg-red-400/15 text-red-300 border-red-400/30",
  fear: "bg-orange-400/15 text-orange-300 border-orange-400/30",
  surprise: "bg-pink-400/15 text-pink-300 border-pink-400/30",
  disgust: "bg-green-400/15 text-green-300 border-green-400/30",
  neutral: "bg-accent/15 text-accent border-accent/30",
};

export function EmotionBadge({ emotion }: { emotion: string }) {
  const key = emotion?.toLowerCase() ?? "neutral";
  const style = EMOTION_STYLES[key] ?? EMOTION_STYLES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {emotion || "unknown"}
    </span>
  );
}

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground-muted ${className}`}
      {...props}
    />
  );
}
