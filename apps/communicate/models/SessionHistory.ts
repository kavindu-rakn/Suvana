import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Optional per-user history of recognition runs, so the dashboard can show
 * "recent translations" (audio text + emotion + matched gloss sequence).
 */
const SessionHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    audioText: { type: String, required: true },
    emotion: { type: String },
    emotionConfidence: { type: Number },
    glossSequence: {
      type: [
        {
          gloss: String,
          cloudinaryUrl: String,
          matchType: String,
          score: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export type SessionHistory = InferSchemaType<typeof SessionHistorySchema>;

export default models.SessionHistory ?? model("SessionHistory", SessionHistorySchema);
