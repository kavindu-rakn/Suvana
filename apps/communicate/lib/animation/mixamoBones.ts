/**
 * Canonical Mixamo skeleton bone names (unprefixed — real Mixamo exports
 * name bones "mixamorigHips", "mixamorigLeftArm", etc.). This list follows
 * Mixamo's standard ~65-bone rig: 7 core spine/head bones, 4 arm segments
 * per side, 5 fingers x (3 joints + 1 tip) per hand, and 5 leg segments per
 * side. Real exports can vary slightly (finger tips / eye bones / toe ends
 * are sometimes omitted depending on export settings), which is why
 * `validateMixamoSkeleton` below checks *naming* (precision), not an exact
 * count.
 */

const CORE = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "HeadTop_End"];

const ARM_SEGMENTS = ["Shoulder", "Arm", "ForeArm", "Hand"];

const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const FINGER_JOINTS = [1, 2, 3, 4]; // 1-3 = knuckles, 4 = fingertip end site

// Confirmed against a real export (lib/json/April_..._2.json): the toe-end
// bone is named "Toe_End", not "ToeBase_End".
const LEG_SEGMENTS = ["UpLeg", "Leg", "Foot", "ToeBase", "Toe_End"];

function sided(names: string[], side: "Left" | "Right"): string[] {
  return names.map((n) => `${side}${n}`);
}

export const MIXAMO_BONES: string[] = [
  ...CORE,
  ...sided(ARM_SEGMENTS, "Left"),
  ...sided(ARM_SEGMENTS, "Right"),
  ...(["Left", "Right"] as const).flatMap((side) =>
    FINGERS.flatMap((finger) => FINGER_JOINTS.map((j) => `${side}Hand${finger}${j}`))
  ),
  ...sided(LEG_SEGMENTS, "Left"),
  ...sided(LEG_SEGMENTS, "Right"),
];

const MIXAMO_PREFIX = /^mixamorig:?/i;

// Of the bones that *do* carry the mixamorig prefix, how many must be
// recognized standard names for us to trust this is a genuine Mixamo rig
// (rather than a custom skeleton that merely reuses the prefix).
const MIN_PRECISION = 0.9;
// Guards against near-empty/junk clips that happen to name one bone right.
const MIN_PREFIXED_BONE_COUNT = 8;

/**
 * Extracts bone/node names from a raw animation JSON payload (either shape
 * mixamoJsonToClip.ts accepts), without needing a live THREE.AnimationClip
 * instance — used server-side in the /api/animations routes, which only
 * ever see the already-serialized JSON, never touch three.js/FBXLoader.
 */
export function extractBoneNamesFromAnimationJson(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];

  const tracks = (json as { tracks?: Array<{ name?: string }> }).tracks;
  if (Array.isArray(tracks)) {
    return tracks
      .map((t) => (typeof t.name === "string" ? t.name : ""))
      .filter(Boolean)
      .map((name) => {
        const dot = name.lastIndexOf(".");
        return dot === -1 ? name : name.slice(0, dot);
      });
  }

  const bones = (json as { bones?: Array<{ name?: string }> }).bones;
  if (Array.isArray(bones)) {
    return bones.map((b) => b.name).filter((n): n is string => typeof n === "string");
  }

  // Baked per-frame format: { fps, duration, frames: [{ time, bones: { boneName: {...} } }] }
  const frames = (json as { frames?: Array<{ bones?: Record<string, unknown> }> }).frames;
  if (Array.isArray(frames) && frames.length > 0 && frames[0].bones) {
    return Object.keys(frames[0].bones);
  }

  return [];
}

export interface MixamoValidationResult {
  isValid: boolean;
  /** How many found bones matched a known standard Mixamo name. */
  matchedCount: number;
  /** Size of the full canonical MIXAMO_BONES list (informational). */
  totalKnown: number;
  /** Recognized standard bone names found in this clip (unprefixed). */
  matched: string[];
  /** mixamorig-prefixed bone names that were NOT recognized. */
  unmatched: string[];
  reason?: string;
}

/**
 * Pure function (no browser APIs) so it can run both client-side, right
 * after parsing an uploaded FBX, and server-side in the /api/animations
 * routes as a defense-in-depth check on submitted JSON.
 */
export function validateMixamoSkeleton(boneNames: string[]): MixamoValidationResult {
  const uniqueNames = Array.from(new Set(boneNames));
  const prefixed = uniqueNames.filter((n) => MIXAMO_PREFIX.test(n));

  if (prefixed.length < MIN_PREFIXED_BONE_COUNT) {
    return {
      isValid: false,
      matchedCount: 0,
      totalKnown: MIXAMO_BONES.length,
      matched: [],
      unmatched: uniqueNames,
      reason:
        prefixed.length === 0
          ? "No 'mixamorig'-prefixed bones found — this doesn't look like a Mixamo-rigged animation."
          : `Only found ${prefixed.length} 'mixamorig'-prefixed bone(s) — expected a fuller Mixamo skeleton.`,
    };
  }

  const knownSet = new Set(MIXAMO_BONES.map((b) => b.toLowerCase()));
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const name of prefixed) {
    const stripped = name.replace(MIXAMO_PREFIX, "");
    if (knownSet.has(stripped.toLowerCase())) {
      matched.push(stripped);
    } else {
      unmatched.push(name);
    }
  }

  const precision = matched.length / prefixed.length;

  if (precision < MIN_PRECISION) {
    return {
      isValid: false,
      matchedCount: matched.length,
      totalKnown: MIXAMO_BONES.length,
      matched,
      unmatched,
      reason: `${unmatched.length} bone name(s) don't match standard Mixamo naming (e.g. "${unmatched[0]}") — this may be a modified or non-Mixamo skeleton.`,
    };
  }

  return {
    isValid: true,
    matchedCount: matched.length,
    totalKnown: MIXAMO_BONES.length,
    matched,
    unmatched,
  };
}
