import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * A saved, selectable avatar model (full Mixamo character FBX: mesh +
 * skeleton, possibly with an embedded animation we ignore). Exactly one
 * doc should have isActive:true at a time — enforced in
 * app/api/models/[id]/route.ts's PATCH handler, not at the schema level.
 */
const ModelSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type Model = InferSchemaType<typeof ModelSchema>;

export default models.Model ?? model("Model", ModelSchema);
