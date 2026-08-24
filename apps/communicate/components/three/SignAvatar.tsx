"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { toAnimationClip } from "@/lib/animation/mixamoJsonToClip";
import { retargetClip } from "./retargetClip";
import { PostureRig } from "./PostureRig";
import {
  useQuickMagicModel,
  DEFAULT_AVATAR,
  type AvatarId,
  type LoadOptions,
  type QuickMagicModel,
} from "./useQuickMagicModel";
import type { GlossMatch } from "@/lib/nlp/matchers/types";
import { styleFor } from "@/lib/emotion/styles";

/**
 * Import fixes are applied unconditionally — they're settled, and the same
 * set the dictionary workbench uses, so a sign previewed there looks identical
 * here. The face bake self-disables now that the head map exists; it stays on
 * as a fallback for any export that ships without one.
 */
const IMPORT_OPTIONS: LoadOptions = {
  stripVertexColors: true,
  weldVertices: true,
  recomputeNormals: false,
  bakeFaceDetail: true,
};

/* ------------------------------------------------------------------ */
/*  Sign-to-sign blending                                             */
/* ------------------------------------------------------------------ */

/**
 * The blend between two signs used to be a flat 0.2s no matter how far the
 * hands had to travel.
 *
 * Measured on a real QuickMagic clip, the pose jump from the end of one sign
 * to the start of the next averages 16 degrees per joint and peaks around 80
 * on the fingers. At 30fps a fixed 0.2s blend gives roughly six frames to
 * absorb that, so the big jumps read as a visible snap while the small ones
 * look sluggish for no reason.
 *
 * Scaling the blend to the size of the jump fixes both ends: short hops stay
 * crisp, long reaches get room to travel.
 */
const FADE_MIN_SECONDS = 0.12;
const FADE_MAX_SECONDS = 0.45;
/** Mean per-joint jump (degrees) at which the blend reaches its maximum. */
const GAP_AT_MAX_FADE = 35;

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Mean angular distance between the avatar's current pose and the first frame
 * of `clip` — i.e. how far the body has to move to get into this sign.
 *
 * Compared against the live bone rotations rather than the previous clip's
 * last keyframe, so it stays correct regardless of where playback actually
 * stopped.
 */
function meanPoseGapDegrees(
  clip: THREE.AnimationClip,
  nodes: Map<string, THREE.Object3D>
): number {
  const target = new THREE.Quaternion();
  let total = 0;
  let counted = 0;

  for (const track of clip.tracks) {
    if (!track.name.endsWith(".quaternion")) continue;
    const node = nodes.get(track.name.slice(0, -".quaternion".length));
    if (!node || track.values.length < 4) continue;

    target.set(track.values[0], track.values[1], track.values[2], track.values[3]);
    // abs() because q and -q are the same rotation.
    const dot = Math.min(1, Math.abs(node.quaternion.dot(target)));
    total += 2 * Math.acos(dot) * RAD_TO_DEG;
    counted++;
  }

  return counted > 0 ? total / counted : 0;
}

function fadeSecondsFor(gapDegrees: number): number {
  const t = Math.min(1, gapDegrees / GAP_AT_MAX_FADE);
  return FADE_MIN_SECONDS + t * (FADE_MAX_SECONDS - FADE_MIN_SECONDS);
}

interface SignAvatarProps {
  avatarId?: AvatarId;
  glossQueue?: GlossMatch[];
  /**
   * Detected (or manually chosen) emotion. Changes playback speed and the
   * pause between signs — see lib/emotion/styles.ts for why it deliberately
   * doesn't touch the movements themselves.
   */
  emotion?: string | null;
  paused?: boolean;
  /** Bump to restart the queue from its first sign. */
  restartKey?: number;
  onGlossChange?: (gloss: string | null) => void;
  onQueueComplete?: () => void;
  onReady?: (model: QuickMagicModel | null) => void;
}

/**
 * The signing avatar.
 *
 * Replaces the old Mixamo-FBX path, which loaded the model through drei's
 * `useFBX` with no import fixes — on this QuickMagic export that renders the
 * character bright red, because the exporter writes a junk per-vertex colour
 * channel that FBXLoader multiplies over every texture. Going through
 * `useQuickMagicModel` gets the same corrected model the dictionary shows.
 */
export function SignAvatar({
  avatarId = DEFAULT_AVATAR,
  glossQueue = [],
  emotion,
  paused,
  restartKey = 0,
  onGlossChange,
  onQueueComplete,
  onReady,
}: SignAvatarProps) {
  const { model } = useQuickMagicModel(avatarId, IMPORT_OPTIONS);
  const clipCacheRef = useRef<Map<string, THREE.AnimationClip>>(new Map());

  useEffect(() => {
    onReady?.(model);
  }, [model, onReady]);

  // Cached clips are retargeted against a specific skeleton, so switching
  // avatars has to drop them.
  useEffect(() => {
    clipCacheRef.current.clear();
  }, [avatarId]);

  const { nodeNames, rootNodeNames, nodesByName } = useMemo(() => {
    const nodes = new Set<string>();
    const roots = new Set<string>();
    const byName = new Map<string, THREE.Object3D>();
    model?.scene.traverse((child) => {
      if (!child.name) return;
      nodes.add(child.name);
      if (!byName.has(child.name)) byName.set(child.name, child);
    });
    for (const child of model?.scene.children ?? []) {
      if (child.name) roots.add(child.name);
    }
    return { nodeNames: nodes, rootNodeNames: roots, nodesByName: byName };
  }, [model]);

  // Keying by contents gives fresh sequencing state for every new queue via
  // remount, with no imperative reset. Folding in restartKey means bumping it
  // also remounts, sending the index back to 0.
  const queueKey = `${avatarId}::${glossQueue.map((g) => g.cloudinaryUrl).join("|")}::${restartKey}`;

  if (!model) return null;

  return (
    <>
      <primitive object={model.scene} dispose={null} />
      <GlossSequencer
        key={queueKey}
        glossQueue={glossQueue}
        emotion={emotion}
        mixer={model.mixer}
        nodeNames={nodeNames}
        rootNodeNames={rootNodeNames}
        nodesByName={nodesByName}
        clipCacheRef={clipCacheRef}
        paused={paused}
        onGlossChange={onGlossChange}
        onQueueComplete={onQueueComplete}
      />
      {/* Mounted after GlossSequencer so its frame callback runs last. */}
      <PostureRig model={model} style={styleFor(emotion)} />
    </>
  );
}

/**
 * Owns the playback index for one gloss queue. Rendered with a content key by
 * <SignAvatar>, so a new queue is a clean remount rather than a reset.
 */
function GlossSequencer({
  glossQueue,
  emotion,
  mixer,
  nodeNames,
  rootNodeNames,
  nodesByName,
  clipCacheRef,
  paused,
  onGlossChange,
  onQueueComplete,
}: {
  glossQueue: GlossMatch[];
  emotion?: string | null;
  mixer: THREE.AnimationMixer;
  nodeNames: Set<string>;
  rootNodeNames: Set<string>;
  nodesByName: Map<string, THREE.Object3D>;
  clipCacheRef: RefObject<Map<string, THREE.AnimationClip>>;
  paused?: boolean;
  onGlossChange?: (gloss: string | null) => void;
  onQueueComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  // Applies to whichever sign is mid-playback; the next one picked up below
  // also starts paused if the hold is still on.
  useEffect(() => {
    if (currentActionRef.current) currentActionRef.current.paused = !!paused;
  }, [paused]);

  useEffect(() => {
    if (index >= glossQueue.length) {
      onGlossChange?.(null);
      if (glossQueue.length > 0) onQueueComplete?.();
      return;
    }

    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const entry = glossQueue[index];
    onGlossChange?.(entry.gloss);

    void (async () => {
      let clip = clipCacheRef.current.get(entry.cloudinaryUrl);

      if (!clip) {
        try {
          const res = await fetch(
            `/api/animations/fetch?url=${encodeURIComponent(entry.cloudinaryUrl)}`
          );
          if (!res.ok) throw new Error(`Failed to fetch animation (${res.status})`);
          const json = await res.json();
          // Retarget against this skeleton before playing. Clips saved from
          // the workbench already had their root track dropped, but older
          // entries may not — and a root track authored for a different
          // up-axis convention lays the avatar on its back.
          clip = retargetClip(
            toAnimationClip(json, entry.gloss),
            nodeNames,
            rootNodeNames
          ).clip;
          clipCacheRef.current.set(entry.cloudinaryUrl, clip);
        } catch (err) {
          console.error(`Could not load animation for gloss "${entry.gloss}":`, err);
          if (!cancelled) setIndex((i) => i + 1);
          return;
        }
      }

      if (cancelled) return;

      const action = mixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.paused = !!paused;
      const style = styleFor(emotion);

      // Blend length is chosen per transition — see FADE_MIN_SECONDS — then
      // divided by the playback rate so the blend stays the same length
      // *relative to the sign*, rather than eating a bigger share of a
      // fast delivery than a slow one.
      const fade = fadeSecondsFor(meanPoseGapDegrees(clip, nodesByName)) / style.speed;

      action.timeScale = style.speed;
      action.fadeIn(fade).play();
      currentActionRef.current = action;

      const handleFinished = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== action) return;
        mixer.removeEventListener("finished", handleFinished);
        action.fadeOut(fade);
        if (cancelled) return;
        // Sad delivery holds the final pose a moment before moving on.
        if (style.hold > 0) {
          holdTimer = setTimeout(() => {
            if (!cancelled) setIndex((i) => i + 1);
          }, style.hold * 1000);
        } else {
          setIndex((i) => i + 1);
        }
      };
      mixer.addEventListener("finished", handleFinished);
    })();

    return () => {
      cancelled = true;
      if (holdTimer) clearTimeout(holdTimer);
      currentActionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, glossQueue, emotion, mixer, nodeNames, rootNodeNames, nodesByName]);

  return null;
}
