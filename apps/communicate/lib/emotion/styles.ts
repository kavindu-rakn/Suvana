/**
 * How a detected emotion changes the way the avatar signs.
 *
 * Two channels only: *timing* (playback speed, pause between signs) and
 * *posture* (a static lean of the torso, head and shoulders held for the whole
 * utterance).
 *
 * Scaling the size of a movement was considered and rejected. In sign language
 * handshape, path and location carry meaning, so stretching or shrinking a
 * sign risks changing what it says. Comprehension is what the project is
 * evaluated on, so sign form is the wrong thing to gamble.
 *
 * Timing and posture are safe by comparison. A sign performed slowly by a
 * slumped signer is the same sign, just delivered differently — which is
 * roughly how affect actually surfaces in signing.
 *
 * Values were tuned against renders of all four side by side: large enough to
 * be told apart at a glance, small enough that the hands stay where the clip
 * put them relative to the chest.
 *
 * These are conditioning parameters, not learned values. Say so in the
 * write-up: the classifier is the trained component, this is the mapping.
 */

export type EmotionLabel = "neutral" | "happy" | "sad" | "angry";

export interface EmotionStyle {
  /** Playback rate multiplier. Kept near 1 so signs stay legible. */
  speed: number;
  /** Extra pause after each sign, in seconds. */
  hold: number;
  /**
   * Forward lean of the upper spine, in degrees. Positive slumps forward,
   * negative opens the chest.
   *
   * The safest of the four posture channels, because it rotates the whole
   * torso frame and the arms hang off it — the hands keep their position
   * *relative to the body*, so body-anchored signs (chest, forehead) stay
   * correct. It is also the one that reads most strongly from the front, so
   * it carries most of the difference between the emotions.
   */
  spineLean: number;
  /** Head pitch in degrees. Positive looks down, negative lifts the chin. */
  headTilt: number;
  /**
   * Head roll in degrees — the sideways tilt. Costs nothing in legibility and
   * is instantly recognisable, so it does the heavy lifting for sad.
   */
  headRoll: number;
  /**
   * Clavicle rotation in degrees, mirrored across the two sides. Positive
   * drops the shoulders (collapsed), negative squares them up.
   *
   * Kept the smallest of the four on purpose: unlike the spine this moves the
   * arm root *without* moving the chest, so it shifts the hands relative to
   * the body. Past roughly 6 degrees that starts to look like a different
   * signing location rather than a different mood.
   */
  shoulder: number;
  label: string;
}

export const EMOTION_STYLES: Record<EmotionLabel, EmotionStyle> = {
  neutral: {
    speed: 1.0,
    hold: 0,
    spineLean: 0,
    headTilt: 0,
    headRoll: 0,
    shoulder: 0,
    label: "Neutral",
  },
  // Chest open, chin up, shoulders squared — brisk and upright.
  happy: {
    speed: 1.15,
    hold: 0,
    spineLean: -6,
    headTilt: -8,
    headRoll: 0,
    shoulder: -4,
    label: "Happy",
  },
  // Leaning into the listener with the head low and shoulders set.
  angry: {
    speed: 1.3,
    hold: 0,
    spineLean: 10,
    headTilt: 4,
    headRoll: 0,
    shoulder: -5,
    label: "Angry",
  },
  // Slumped, head down and tilted, shoulders collapsed, slow with a pause.
  sad: {
    speed: 0.8,
    hold: 0.25,
    spineLean: 14,
    headTilt: 15,
    headRoll: 8,
    shoulder: 6,
    label: "Sad",
  },
};

export const EMOTION_ORDER: EmotionLabel[] = ["neutral", "happy", "sad", "angry"];

/**
 * Maps a raw classifier label onto one of our four.
 *
 * The emotion model currently in the notebook is an English 7-class one
 * (angry / disgust / fear / happy / neutral / sad / surprise), and a Sinhala
 * replacement may use a different set again. Anything unrecognised falls back
 * to neutral rather than guessing, so an unexpected label can't silently
 * distort playback.
 */
export function resolveEmotion(raw: string | null | undefined): EmotionLabel {
  const key = (raw ?? "").trim().toLowerCase();
  if (key in EMOTION_STYLES) return key as EmotionLabel;

  // Nearest sensible bucket for labels outside our four.
  if (key === "disgust" || key === "fear") return "sad";
  if (key === "surprise" || key === "surprised") return "happy";
  if (key === "anger") return "angry";
  if (key === "happiness" || key === "joy") return "happy";
  if (key === "sadness") return "sad";

  return "neutral";
}

export function styleFor(raw: string | null | undefined): EmotionStyle {
  return EMOTION_STYLES[resolveEmotion(raw)];
}

/**
 * Plain-English summary of everything an emotion changes, for tooltips and
 * captions. Built from the values rather than written out per emotion, so
 * retuning the table can't leave the UI describing the old behaviour.
 */
export function describeStyle(id: EmotionLabel): string {
  const style = EMOTION_STYLES[id];
  const parts = [`speed x${style.speed}`];
  if (style.hold) parts.push(`+${style.hold}s pause between signs`);
  if (style.spineLean) parts.push(`${style.spineLean > 0 ? "slumped" : "upright"} torso`);
  if (style.headTilt || style.headRoll) parts.push("head tilt");
  if (style.shoulder) parts.push(`${style.shoulder > 0 ? "dropped" : "squared"} shoulders`);
  return parts.join(" · ");
}
