import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * A Suvana account. One identity across the platform: the shell, Learn and
 * Communicate are served from the same origin (the shell rewrites /learn/*
 * and /communicate/* to their own deployments), so the Auth.js session cookie
 * set here is visible to all of them. Recognition is the exception — it runs
 * on its own origin for its WebSocket and does not share this cookie.
 */
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    /**
     * Admins may manage sign animations, avatar models and other people's
     * roles. Everyone starts as `user`: privilege is granted deliberately,
     * never by signing up. See lib/roles.ts for how the first admin exists.
     */
    role: { type: String, enum: ROLES, default: "user", required: true },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof UserSchema>;

export default models.User ?? model("User", UserSchema);
