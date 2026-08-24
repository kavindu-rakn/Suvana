import { Card } from "@/components/ui/Card";
import { EmotionBadge } from "@/components/ui/Badge";

export interface TranscriptionData {
  text: string;
  emotion: string;
  confidence: number | null;
}

export function TranscriptionResult({ result }: { result: TranscriptionData }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs uppercase tracking-wider text-foreground-muted">Transcript</span>
        <EmotionBadge emotion={result.emotion} />
      </div>
      <p className="mt-3 text-lg leading-relaxed">{result.text || "(no speech detected)"}</p>
      {result.confidence != null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-foreground-muted">
            <span>Emotion confidence</span>
            <span>{Math.round(result.confidence * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, Math.round(result.confidence * 100))}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
