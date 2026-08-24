import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * One entry per sign-language gloss. `gloss` is the canonical token (e.g.
 * "HELLO"); `synonyms` are the words/phrases in recognized speech text that
 * should map to it. The actual animation keyframe data lives in Cloudinary
 * as a raw JSON resource — only its URL/public id is kept here.
 */
// Normalizes to Unicode NFC (composed form) before trimming/uppercasing.
// Sinhala (and other combining-mark scripts) can represent the same visible
// text with different underlying byte sequences (NFC vs NFD) depending on
// input method/keyboard — without this, two glosses that *look* identical
// can fail to string-match in app/api/gloss/predict/route.ts.
function normalizeGlossName(v: string): string {
  return v.normalize("NFC").trim().toUpperCase();
}

const GlossSchema = new Schema(
  {
    gloss: { type: String, required: true, unique: true, set: normalizeGlossName },
    synonyms: {
      type: [String],
      default: [],
      set: (arr: string[]) => arr.map((s) => s.normalize("NFC").trim()),
    },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    previewImage: { type: String },
    /**
     * Skeleton family the clip's bone names target. Existing documents
     * predate this field and were all Mixamo-validated on the way in, so
     * that's the default — playback can rely on it without a migration.
     */
    rig: { type: String, enum: ["mixamo", "biped"], default: "mixamo" },
    /**
     * Which avatar the clip was authored against.
     *
     * Bone *names* are shared between the two QuickMagic avatars, but their
     * bind poses are not — the forearm and hand rest orientations differ by
     * 65-95 degrees, and the boy's arms are ~70% longer. Clip tracks store
     * rotations relative to each bone's rest pose, so replaying a girl clip
     * on the boy collapses his shoulders. Recorded so playback can warn
     * instead of silently deforming the model.
     */
    sourceAvatar: { type: String, enum: ["girl", "boy"] },
    /** Clip length in seconds, denormalised so the list can show it without fetching the JSON. */
    duration: { type: Number },
    /** Distinct bone tracks, likewise denormalised for the dictionary list. */
    boneCount: { type: Number },
  },
  { timestamps: true }
);

GlossSchema.index({ synonyms: 1 });

export type Gloss = InferSchemaType<typeof GlossSchema>;

export default models.Gloss ?? model("Gloss", GlossSchema);
