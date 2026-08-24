/**
 * The recording script for the emotion dataset.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  REPLACE THESE SENTENCES with the SSL400 ones you already have signs for.
 *  They are placeholders: everyday Sinhala phrases chosen to be easy to
 *  perform in four moods, but they are NOT verified against SSL400, and if a
 *  sentence has no sign the demo cannot run end to end on it.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Why the same sentences in every emotion: if the sad clips also contain
 * different *words*, a classifier can reach the right answer by recognising
 * vocabulary instead of delivery, and it then collapses on real input. Holding
 * the words fixed forces it to learn prosody, which is the whole point.
 *
 * Keep them short — two to four seconds spoken. Long sentences drift in
 * emotion halfway through and give the model a muddled example.
 */

export interface ScriptLine {
  /** Stable id used in the filename. Never renumber these — existing
   *  recordings would silently attach themselves to a different sentence. */
  id: string;
  si: string;
  /** Rough English, shown to help non-Sinhala speakers verify the list. */
  en: string;
}

export const SENTENCES: ScriptLine[] = [
  { id: "s01", si: "ඔයා කොහෙද යන්නේ", en: "Where are you going?" },
  { id: "s02", si: "මම ගෙදර යනවා", en: "I am going home." },
  { id: "s03", si: "අද වැඩට යන්න ඕන", en: "I have to go to work today." },
  { id: "s04", si: "මට උදව් කරන්න පුළුවන්ද", en: "Can you help me?" },
  { id: "s05", si: "ඔයාට බොහොම ස්තූතියි", en: "Thank you very much." },
  { id: "s06", si: "මම දැන් එනවා", en: "I am coming now." },
  { id: "s07", si: "ඒක මට තේරුණේ නෑ", en: "I did not understand that." },
  { id: "s08", si: "අද කාලගුණය හොඳයි", en: "The weather is good today." },
  { id: "s09", si: "මට ටිකක් වතුර දෙන්න", en: "Give me some water." },
  { id: "s10", si: "ඔයා මොකද කරන්නේ", en: "What are you doing?" },
  { id: "s11", si: "මම ඔයාට කතා කරන්නම්", en: "I will call you." },
  { id: "s12", si: "දැන් වෙලාව කීයද", en: "What time is it now?" },
  { id: "s13", si: "මට එහෙම කරන්න බෑ", en: "I cannot do that." },
  { id: "s14", si: "ඔයා හොඳින්ද", en: "Are you well?" },
  { id: "s15", si: "අපි හෙට හම්බවෙමු", en: "Let us meet tomorrow." },
  { id: "s16", si: "මට ඒක ඕන නෑ", en: "I do not want that." },
  { id: "s17", si: "ගොඩක් හොඳයි", en: "That is very good." },
  { id: "s18", si: "මම පොඩ්ඩක් ඉන්නම්", en: "I will wait a moment." },
  { id: "s19", si: "ඔයාට කුමක්ද වුණේ", en: "What happened to you?" },
  { id: "s20", si: "මට දැන් යන්න ඕන", en: "I need to go now." },
];

export const EMOTIONS = ["neutral", "happy", "sad", "angry"] as const;
export type Emotion = (typeof EMOTIONS)[number];

/**
 * Performance direction for each emotion.
 *
 * This is the part that most affects data quality, and the reason it is
 * spelled out rather than left to the speaker: the first attempt at this
 * dataset failed partly because restrained, polite delivery of "angry" is
 * acoustically indistinguishable from neutral. Contributors consistently
 * under-perform unless told, in plain terms, to push further than feels
 * comfortable.
 */
export const DIRECTION: Record<
  Emotion,
  { label: string; short: string; how: string[]; avoid: string; color: string }
> = {
  neutral: {
    label: "Neutral",
    short: "Flat and ordinary",
    how: [
      "Read it the way you would read out a bus timetable.",
      "Even pace, even volume, no rise or fall at the end.",
      "This is the baseline everything else is measured against — keep it genuinely plain.",
    ],
    avoid: "Do not sound bored or tired. Bored is close to sad, and it blurs the two.",
    color: "#8f8ba0",
  },
  happy: {
    label: "Happy",
    short: "Bright and quick",
    how: [
      "You have just heard good news and you are telling a friend.",
      "Faster than normal. Pitch higher, and moving around a lot.",
      "Smile while you speak — it genuinely changes the sound.",
    ],
    avoid: "Do not just get louder. Loud on its own reads as angry.",
    color: "#f4b400",
  },
  sad: {
    label: "Sad",
    short: "Slow, quiet, falling",
    how: [
      "Something disappointing has happened. You are telling someone about it.",
      "Slower than normal, quieter, and low in your range.",
      "Let the end of the sentence fall away and fade.",
      "Pause slightly longer between words than you normally would.",
    ],
    avoid: "Do not whisper. Whispering removes pitch entirely and the clip becomes unusable.",
    color: "#6ea8fe",
  },
  angry: {
    label: "Angry",
    short: "Hard, fast, forceful",
    how: [
      "Someone has done something that genuinely annoys you and you are confronting them.",
      "Fast, loud, and clipped. Bite the ends of words off.",
      "Push much harder than feels polite — this is the one everyone under-performs.",
    ],
    avoid:
      "Restrained, controlled anger sounds exactly like neutral to the model. If it feels a bit theatrical, it is probably right.",
    color: "#ef5350",
  },
};

export const TOTAL_TAKES = SENTENCES.length * EMOTIONS.length;
