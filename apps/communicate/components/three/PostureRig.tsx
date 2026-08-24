"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EmotionStyle } from "@/lib/emotion/styles";
import type { QuickMagicModel } from "./useQuickMagicModel";

/** World-space axes the posture offsets rotate around. */
const AXIS_PITCH = new THREE.Vector3(1, 0, 0); // forward / back
const AXIS_ROLL = new THREE.Vector3(0, 0, 1); // side tilt, shoulder drop

/**
 * Bones the posture offset is applied to.
 *
 * `share` splits one channel over several bones — spreading the spine lean
 * across two joints curves the back instead of hinging it at a single point.
 * `mirror` flips the sign for the right side, so both shoulders drop together
 * rather than the pair rotating as one.
 *
 * Order matters: each entry re-reads its parent's world orientation, so the
 * spine has to be leaned before the head and shoulders stack on top of it.
 */
const POSTURE_BONES = [
  { name: "Bip001_Spine1", key: "spineLean" as const, share: 0.55, axis: AXIS_PITCH, mirror: 1 },
  { name: "Bip001_Spine2", key: "spineLean" as const, share: 0.45, axis: AXIS_PITCH, mirror: 1 },
  { name: "Bip001_Head", key: "headTilt" as const, share: 1, axis: AXIS_PITCH, mirror: 1 },
  { name: "Bip001_Head", key: "headRoll" as const, share: 1, axis: AXIS_ROLL, mirror: 1 },
  { name: "Bip001_L_Clavicle", key: "shoulder" as const, share: 1, axis: AXIS_ROLL, mirror: 1 },
  { name: "Bip001_R_Clavicle", key: "shoulder" as const, share: 1, axis: AXIS_ROLL, mirror: -1 },
];

type PostureChannel = (typeof POSTURE_BONES)[number]["key"];

const POSTURE_CHANNELS: PostureChannel[] = ["spineLean", "headTilt", "headRoll", "shoulder"];

/** How fast the posture eases toward its target, per second. */
const POSTURE_EASE = 6;

/** Bit-exact comparison — see `resolveBase` for why exactness is the point. */
function sameQuaternion(a: THREE.Quaternion, b: THREE.Quaternion): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w;
}

interface BoneState {
  /** The rotation before our offset — the mixer's, or the rest pose. */
  base: THREE.Quaternion;
  /** Exactly what we left on the bone last frame. */
  written: THREE.Quaternion;
  /** False until the first frame has run, when `written` is meaningless. */
  primed: boolean;
}

/**
 * Leans the torso, head and shoulders according to the current emotion.
 *
 * Mount this **after** whatever drives the mixer: `useFrame` subscriptions at
 * the same priority fire in mount order, and `useQuickMagicModel` registers
 * its mixer update first. Applying the offset before the mixer would simply be
 * overwritten by the clip.
 *
 * The offset is built in world space and converted into each bone's parent
 * space, because Biped bones have awkward local axes — rotating around a
 * bone's own X would tilt it sideways rather than forward.
 *
 * ## Why the offset can't just be multiplied in
 *
 * The obvious implementation — premultiply the offset onto `bone.quaternion`
 * every frame — is wrong, and wrong in a way that isn't visible in a
 * single-frame render.
 *
 * It assumes the mixer rewrites every bone each frame, so that each frame
 * starts from a clean rotation. That only holds for bones the *current clip
 * has a track for*. A clip that never touches the clavicles, or any moment
 * with no clip playing at all, leaves those bones holding last frame's result
 * — so the offset multiplies into itself, once per frame, forever. Measured on
 * the live page it took a few seconds to wind the shoulders past 118 degrees
 * and then denormalise the quaternion to [0,0,0,0] outright, which collapses
 * the mesh.
 *
 * `resolveBase` fixes it by tracking, per bone, exactly what we left behind
 * last frame. If the bone still holds that value the mixer skipped it, so the
 * base is last frame's pre-offset rotation; if it holds anything else the
 * mixer wrote a fresh pose, and that becomes the new base. Exact float
 * equality is the right test rather than a tolerance: the mixer writes bone
 * rotations by copying floats, so an untouched bone is bit-identical, and a
 * touched one differs in at least one bit.
 */
export function PostureRig({
  model,
  style,
}: {
  model: QuickMagicModel;
  style: EmotionStyle;
}) {
  /**
   * Resolved bones, **grouped by object**, each carrying every channel that
   * targets it.
   *
   * Grouping is load-bearing, not tidiness. The head is driven by two entries
   * (pitch and roll); with one state per entry each would see the other's
   * output, conclude the mixer had written a fresh pose, and adopt it as its
   * base — the same runaway the base-tracking exists to prevent, just confined
   * to whichever bone has more than one channel. One state per *object*, with
   * the channels composed into a single offset, removes the ambiguity.
   */
  const bones = useMemo(() => {
    const byObject = new Map<
      THREE.Object3D,
      { object: THREE.Object3D; channels: (typeof POSTURE_BONES)[number][] }
    >();
    for (const cfg of POSTURE_BONES) {
      const object = model.scene.getObjectByName(cfg.name);
      if (!object) continue;
      const existing = byObject.get(object);
      if (existing) existing.channels.push(cfg);
      else byObject.set(object, { object, channels: [cfg] });
    }
    return [...byObject.values()];
  }, [model]);

  // Each channel is eased toward its target rather than snapped, so switching
  // emotion mid-sentence glides. Tracked per channel (not as one blend factor)
  // so a change *between* two emotions eases too, not just the first one.
  const eased = useRef<Record<PostureChannel, number>>({
    spineLean: 0,
    headTilt: 0,
    headRoll: 0,
    shoulder: 0,
  }).current;
  const parentWorld = useRef(new THREE.Quaternion()).current;
  const offsetWorld = useRef(new THREE.Quaternion()).current;
  const scratch = useRef(new THREE.Quaternion()).current;

  /**
   * One entry per bone, index-aligned with `bones`.
   *
   * Held in a ref and only ever touched inside `useFrame`; rebuilt whenever
   * `bones` changes identity, because the remembered rotations belong to the
   * skeleton that has just been swapped out.
   */
  const statesRef = useRef<{ owner: typeof bones; list: BoneState[] } | null>(null);

  useFrame((_, delta) => {
    const step = Math.min(1, delta * POSTURE_EASE);
    for (const channel of POSTURE_CHANNELS) {
      eased[channel] += (style[channel] - eased[channel]) * step;
    }

    if (!statesRef.current || statesRef.current.owner !== bones) {
      statesRef.current = {
        owner: bones,
        list: bones.map((b) => ({
          base: b.object.quaternion.clone(),
          written: new THREE.Quaternion(),
          primed: false,
        })),
      };
    }
    const states = statesRef.current.list;

    for (let i = 0; i < bones.length; i++) {
      const { object, channels } = bones[i];
      const state = states[i];

      // Did anything else write this bone since we last touched it?
      if (state.primed && sameQuaternion(object.quaternion, state.written)) {
        // No — so what it holds is our own output. Rewind to the base.
        object.quaternion.copy(state.base);
      } else {
        // Yes — the mixer (or the loader) put a fresh pose here. Trust it.
        state.base.copy(object.quaternion);
      }

      // Compose every channel targeting this bone into one world-space
      // rotation, so the whole thing can be applied — and therefore undone —
      // as a single offset.
      offsetWorld.identity();
      let any = false;
      for (const channel of channels) {
        const degrees = eased[channel.key] * channel.share * channel.mirror;
        if (Math.abs(degrees) < 0.01) continue;
        scratch.setFromAxisAngle(channel.axis, (degrees * Math.PI) / 180);
        offsetWorld.premultiply(scratch);
        any = true;
      }

      if (any) {
        const parent = object.parent;
        if (parent) {
          parent.getWorldQuaternion(parentWorld);
          // localOffset = P^-1 * R * P, so a world-space lean lands correctly
          // whatever the bone's rest orientation happens to be.
          scratch.copy(parentWorld).invert().multiply(offsetWorld).multiply(parentWorld);
          object.quaternion.premultiply(scratch);
        } else {
          object.quaternion.premultiply(offsetWorld);
        }
      }

      // Recorded even when no offset applied, so the next frame can still tell
      // our output apart from a fresh pose.
      state.written.copy(object.quaternion);
      state.primed = true;
    }
  });

  return null;
}
