import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Generic singleton-per-key config store. Used for the dynamic ngrok URL
 * registry: { key: "ngrok_url", value: "https://xxxx.ngrok-free.app" }.
 * Reading always hits the DB directly so the app never relies on a stale,
 * hardcoded/env-baked URL.
 */
const ConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export type Config = InferSchemaType<typeof ConfigSchema>;

export default models.Config ?? model("Config", ConfigSchema);
