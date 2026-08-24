import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * One recorded take from a contributor.
 *
 * The audio itself lives in Cloudinary as a raw WAV; only the URL is kept
 * here, matching how Gloss stores its animation JSON.
 *
 * Two identifiers, deliberately:
 *
 *   speakerKey  a random id the browser generates once and keeps in
 *               localStorage. It is what lets someone close the tab and come
 *               back to an unfinished session, and it is not derived from
 *               anything personal.
 *   speakerNo   a short sequential number ("01", "02") assigned on first
 *               upload. It exists because the training notebook groups by the
 *               leading field of the filename, and `spk01_s03_happy.wav`
 *               is far easier to read in a listing than a uuid.
 *
 * Nothing identifying is stored — no name, email or IP. A voice recording is
 * personal data on its own, so there is no reason to attach more to it than
 * the task needs.
 */
const VoiceSampleSchema = new Schema(
  {
    speakerKey: { type: String, required: true, index: true },
    speakerNo: { type: String, required: true },
    /** Matches ScriptLine.id in lib/data/recordingScript.ts. */
    sentenceId: { type: String, required: true },
    /** Copied in at upload time so the dataset stays readable if the script is later edited. */
    sentenceText: { type: String, required: true },
    emotion: {
      type: String,
      required: true,
      enum: ["neutral", "happy", "sad", "angry"],
    },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    /** Filename the export uses — also what the notebook parses. */
    fileName: { type: String, required: true },

    durationSec: { type: Number },
    /** Peak amplitude 0-1, so quiet or clipped takes can be filtered without re-downloading. */
    peak: { type: Number },
    sampleRate: { type: Number, default: 16000 },

    /** Optional, self-reported, and only useful for reporting dataset composition. */
    gender: { type: String, enum: ["female", "male", "other", "unspecified"], default: "unspecified" },
    ageBand: { type: String },

    /** Explicit consent is recorded per session; see app/contribute. */
    consentedAt: { type: Date, required: true },
    /** Set if a contributor asks to withdraw, so exports can exclude it without deleting history. */
    withdrawn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One take per speaker/sentence/emotion — re-recording replaces rather than
// accumulating duplicates, which would otherwise silently weight some
// sentences more heavily than others in training.
VoiceSampleSchema.index(
  { speakerKey: 1, sentenceId: 1, emotion: 1 },
  { unique: true }
);

export type VoiceSample = InferSchemaType<typeof VoiceSampleSchema>;

export default models.VoiceSample ?? model("VoiceSample", VoiceSampleSchema);
