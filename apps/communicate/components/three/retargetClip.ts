import * as THREE from "three";

/**
 * Binding analysis for an animation clip against a target skeleton.
 *
 * Worth being explicit about why this matters for `models/A`: that character
 * carries a **3ds Max Biped** rig — bones are named `Bip001_Pelvis`,
 * `Bip001_L_Finger12`, and so on. It is *not* a Mixamo rig. A clip
 * downloaded from Mixamo targets `mixamorig:Hips` and friends and will bind
 * zero tracks here, playing as a completely motionless character with no
 * error thrown anywhere. `AnimationMixer` silently drops tracks it can't
 * resolve, so without this report a failed retarget is indistinguishable
 * from a paused animation.
 */
export interface ClipBindingReport {
  /** Distinct node names the clip's tracks target. */
  totalTargets: number;
  /** How many of those resolve to a node in the model. */
  matchedTargets: number;
  /** Targets with no counterpart, capped for display. */
  unmatched: string[];
  /** True when colon-stripping was needed to get the match rate up. */
  normalized: boolean;
  /** Rough guess at the rig family the clip was authored for. */
  clipRig: RigFamily;
  /** Rough guess at the rig family of the model. */
  modelRig: RigFamily;
  /** Root-transform targets dropped so the clip can't fight the model's up-axis. */
  droppedRootTargets: string[];
}

export type RigFamily = "mixamo" | "biped" | "unknown";

function detectRig(names: string[]): RigFamily {
  if (names.some((n) => /^mixamorig/i.test(n))) return "mixamo";
  if (names.some((n) => /^bip\d*[_ ]/i.test(n))) return "biped";
  return "unknown";
}

/** Strip the property suffix (`.quaternion`, `.position`, …) off a track name. */
function targetOf(trackName: string): string {
  const dot = trackName.lastIndexOf(".");
  return dot === -1 ? trackName : trackName.slice(0, dot);
}

const MAX_REPORTED_UNMATCHED = 8;

/**
 * Matches a clip's track targets against the model's node names, applying
 * the one transformation that's safe to do automatically.
 *
 * That transformation is colon-stripping: FBXLoader removes colons from node
 * names it builds (`mixamorig:Hips` → `mixamorigHips`) but clips parsed from
 * a separate FBX can keep them, so the two sides disagree over a purely
 * cosmetic difference. Rewriting the track names closes that gap.
 *
 * Nothing else is remapped. Translating a Mixamo clip onto a Biped skeleton
 * is a real retarget — different names, different rest poses, different bone
 * roll — and quietly approximating it would produce a subtly wrong result
 * that's worse than an honest "these don't match".
 */
export function retargetClip(
  clip: THREE.AnimationClip,
  modelNodeNames: Set<string>,
  /**
   * Names of the nodes sitting directly under the model root — the rig's root
   * transform. Tracks targeting these are dropped; see the note below.
   */
  rootNodeNames: Set<string> = new Set()
): { clip: THREE.AnimationClip; report: ClipBindingReport } {
  const targets = [...new Set(clip.tracks.map((t) => targetOf(t.name)))];
  const droppedRootTargets = targets.filter((t) => rootNodeNames.has(t));

  const directMatches = targets.filter((t) => modelNodeNames.has(t)).length;
  const strippedMatches = targets.filter((t) => modelNodeNames.has(t.replace(/:/g, ""))).length;
  const shouldStrip = strippedMatches > directMatches;

  let result = clip;
  if (shouldStrip) {
    result = new THREE.AnimationClip(
      clip.name,
      clip.duration,
      clip.tracks.map((track) => {
        const target = targetOf(track.name);
        const property = track.name.slice(target.length);
        const fixed = target.replace(/:/g, "");
        if (fixed === target) return track;
        const cloned = track.clone();
        cloned.name = fixed + property;
        return cloned;
      })
    );
  }

  /*
   * Drop tracks that drive the rig's root transform.
   *
   * The two QuickMagic avatars disagree about where the up-axis lives. The
   * girl's FBX is Y-up, so her root node sits at identity and `Bip001` carries
   * a -104° X rotation. The boy's is Z-up, so FBXLoader puts a -90° X
   * correction on the root and `Bip001` sits near identity. Play the girl's
   * clip on the boy and her `Bip001 = -104°` stacks on his -90° root: he ends
   * up rotated ~-194° and lies on the floor.
   *
   * Dropping the root track lets each model keep its own bind-pose root, so
   * the same clip stands upright on either. Measured on all four
   * model/clip combinations. What's lost is root motion — the character no
   * longer translates or turns as a whole — which is what you want for a sign
   * language avatar anyway, since signs are performed in place.
   */
  if (droppedRootTargets.length > 0) {
    const dropped = new Set(droppedRootTargets);
    result = new THREE.AnimationClip(
      result.name,
      result.duration,
      result.tracks.filter((track) => !dropped.has(targetOf(track.name)))
    );
  }

  const resolve = (t: string) => (shouldStrip ? t.replace(/:/g, "") : t);
  const unmatched = targets.filter(
    (t) => !rootNodeNames.has(t) && !modelNodeNames.has(resolve(t))
  );
  const considered = targets.filter((t) => !rootNodeNames.has(t));

  return {
    clip: result,
    report: {
      totalTargets: considered.length,
      matchedTargets: considered.length - unmatched.length,
      unmatched: unmatched.slice(0, MAX_REPORTED_UNMATCHED),
      normalized: shouldStrip,
      clipRig: detectRig(targets),
      modelRig: detectRig([...modelNodeNames]),
      droppedRootTargets,
    },
  };
}

/** Human-readable verdict for the diagnostics panel. */
export function describeBinding(report: ClipBindingReport): {
  tone: "ok" | "warn" | "fail";
  headline: string;
  detail: string;
} {
  const { matchedTargets, totalTargets, clipRig, modelRig, normalized, unmatched } = report;
  const ratio = totalTargets === 0 ? 0 : matchedTargets / totalTargets;

  if (matchedTargets === 0) {
    return {
      tone: "fail",
      headline: `No tracks bound (0 / ${totalTargets}).`,
      detail:
        clipRig !== modelRig && clipRig !== "unknown" && modelRig !== "unknown"
          ? `This clip is authored for a ${clipRig} rig, but the model is a ${modelRig} rig. The character will not move. Retarget the animation onto ${modelRig} bone names before exporting it.`
          : `None of the clip's track targets exist on this skeleton, so the mixer drops every track. Sample targets: ${unmatched.join(", ")}`,
    };
  }

  const rootNote =
    report.droppedRootTargets.length > 0
      ? ` Root transform (${report.droppedRootTargets.join(", ")}) is ignored so the clip can't fight this model's up-axis — the sign plays in place.`
      : "";

  if (ratio >= 0.9) {
    return {
      tone: "ok",
      headline: `${matchedTargets} / ${totalTargets} targets bound.`,
      detail:
        (normalized
          ? "Colons were stripped from track names to match the model's node naming."
          : unmatched.length > 0
            ? `Unbound targets are helper nodes rather than deforming bones: ${unmatched.join(", ")}`
            : "Every track resolved to a node on the model.") + rootNote,
    };
  }

  return {
    tone: "warn",
    headline: `Only ${matchedTargets} / ${totalTargets} targets bound.`,
    detail: `Parts of the skeleton will stay in bind pose. Unmatched: ${unmatched.join(", ")}`,
  };
}
