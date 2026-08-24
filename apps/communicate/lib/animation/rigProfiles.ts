import {
  MIXAMO_BONES,
  extractBoneNamesFromAnimationJson,
  validateMixamoSkeleton,
} from "./mixamoBones";

/**
 * Rig-family detection and validation for stored animation clips.
 *
 * Why this exists: `validateMixamoSkeleton` hard-rejects any clip whose bones
 * aren't `mixamorig`-prefixed, which was fine while every animation came from
 * Mixamo. The QuickMagic avatar in `models/A` is rigged with **3ds Max Biped**
 * (`Bip001_Pelvis`, `Bip001_L_Finger12`, …), so clips authored against it —
 * including everything exported from the FBX workbench — were being refused
 * by both /api/animations routes.
 *
 * Rather than weaken the check, this widens it to a set of *known* rig
 * families and still refuses anything it can't recognise. The detected family
 * is stored alongside the gloss so playback can tell which skeleton a clip
 * expects instead of guessing.
 */

export type RigFamily = "mixamo" | "biped" | "unknown";

const MIXAMO_PREFIX = /^mixamorig:?/i;
/** 3ds Max Biped: "Bip001_Pelvis", "Bip01 Spine", "Bip001 L Hand", … */
const BIPED_PREFIX = /^bip\d*[\s_]/i;

/** Guards against near-empty clips that happen to name one bone plausibly. */
const MIN_BONE_COUNT = 8;

/**
 * How many Biped-named bones a clip must carry before we treat it as a real
 * Biped rig.
 *
 * Deliberately a count rather than a share of all tracks. FBX clips routinely
 * animate non-bone nodes too — the QuickMagic export targets 77 nodes, of
 * which 9 are the bare `Bip001` root and the eight mesh objects (Head, Hair,
 * Eye, Gloves, …). A ratio test counts those as failures and rejects a
 * perfectly good rig. The Mixamo path doesn't have this problem because its
 * ratio is computed only over already-prefixed names, where it measures
 * something real (how many are canonical Mixamo bones); Biped has no
 * canonical name list, so presence and count are what's actually checkable.
 */
const MIN_BIPED_BONES = 20;

/**
 * Biped skeletons are far less standardised than Mixamo's — the bone set
 * depends on how many spine links and finger joints the rigger enabled — so
 * this validates *shape* rather than an exact name list: a root/pelvis, a
 * spine, and both hands present.
 */
const BIPED_REQUIRED = [/pelvis|root/i, /spine/i, /l[\s_]?hand/i, /r[\s_]?hand/i];

export interface SkeletonValidationResult {
  isValid: boolean;
  rig: RigFamily;
  /** Distinct node names the clip targets. */
  boneCount: number;
  /** Finger joints found — the part that actually matters for sign language. */
  fingerBoneCount: number;
  reason?: string;
}

/** Best-guess rig family for a set of bone names. */
export function detectRig(boneNames: string[]): RigFamily {
  if (boneNames.some((n) => MIXAMO_PREFIX.test(n))) return "mixamo";
  if (boneNames.some((n) => BIPED_PREFIX.test(n))) return "biped";
  return "unknown";
}

function countFingerBones(boneNames: string[]): number {
  return boneNames.filter((n) =>
    /finger|thumb|index|middle|ring|pinky/i.test(n)
  ).length;
}

/**
 * Validates a clip's bone names against whichever rig family they appear to
 * belong to. Pure (no browser or DB access) so it can run client-side right
 * after parsing an upload and server-side as defence in depth.
 */
export function validateSkeleton(boneNames: string[]): SkeletonValidationResult {
  const unique = Array.from(new Set(boneNames));
  const rig = detectRig(unique);
  const fingerBoneCount = countFingerBones(unique);

  if (unique.length < MIN_BONE_COUNT) {
    return {
      isValid: false,
      rig,
      boneCount: unique.length,
      fingerBoneCount,
      reason: `Only ${unique.length} bone track(s) found — too few to be a usable animation.`,
    };
  }

  if (rig === "mixamo") {
    // Defer to the existing, stricter Mixamo name check so behaviour for
    // clips that already worked is bit-for-bit unchanged.
    const result = validateMixamoSkeleton(unique);
    return {
      isValid: result.isValid,
      rig: "mixamo",
      boneCount: unique.length,
      fingerBoneCount,
      reason: result.reason,
    };
  }

  if (rig === "biped") {
    const prefixed = unique.filter((n) => BIPED_PREFIX.test(n));

    if (prefixed.length < MIN_BIPED_BONES) {
      return {
        isValid: false,
        rig,
        boneCount: unique.length,
        fingerBoneCount,
        reason: `Only ${prefixed.length} Biped-named bone(s) found — expected at least ${MIN_BIPED_BONES} for a full skeleton.`,
      };
    }

    const missing = BIPED_REQUIRED.filter((re) => !prefixed.some((n) => re.test(n)));
    if (missing.length > 0) {
      return {
        isValid: false,
        rig,
        boneCount: unique.length,
        fingerBoneCount,
        reason:
          "Biped rig is missing expected bones (pelvis/spine/both hands) — it may be a partial export.",
      };
    }

    return { isValid: true, rig, boneCount: unique.length, fingerBoneCount };
  }

  return {
    isValid: false,
    rig: "unknown",
    boneCount: unique.length,
    fingerBoneCount,
    reason: `Unrecognised skeleton — expected Mixamo ("mixamorig…") or 3ds Max Biped ("Bip001…") bone names, got e.g. "${unique[0]}".`,
  };
}

/** Convenience wrapper: validate straight from a stored animation JSON payload. */
export function validateAnimationJson(json: unknown): SkeletonValidationResult {
  return validateSkeleton(extractBoneNamesFromAnimationJson(json));
}

export { MIXAMO_BONES, extractBoneNamesFromAnimationJson };
