import type { GlossMatch } from "@/lib/nlp/matchers/types";

/**
 * Colour-coded by how the word was resolved, so a guess is visibly different
 * from a certainty — the further down the matching ladder a sign came from,
 * the warmer the chip.
 */
const MATCH_STYLES: Record<GlossMatch["matchType"], string> = {
  exact: "bg-accent/15 text-accent border-accent/30",
  synonym: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  stem: "bg-teal-400/15 text-teal-300 border-teal-400/30",
  phonetic: "bg-teal-400/15 text-teal-300 border-teal-400/30",
  fuzzy: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  ml: "bg-pink-400/15 text-pink-300 border-pink-400/30",
};

/** Plain-language explanation shown on hover. */
const MATCH_LABELS: Record<GlossMatch["matchType"], string> = {
  exact: "exact dictionary word",
  synonym: "listed synonym",
  stem: "matched after removing a Sinhala ending",
  phonetic: "same sound, different spelling",
  fuzzy: "closest spelling",
  ml: "predicted by model",
};

export function GlossSequenceList({ matches }: { matches: GlossMatch[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {matches.map((m, i) => (
        <span
          key={`${m.gloss}-${i}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${MATCH_STYLES[m.matchType]}`}
          title={`${MATCH_LABELS[m.matchType]} · score ${m.score}`}
        >
          {m.gloss}
        </span>
      ))}
    </div>
  );
}
