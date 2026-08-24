import * as THREE from "three";

/**
 * Converts a stored gloss animation JSON payload into a THREE.AnimationClip
 * that can be played with an AnimationMixer on the rigged avatar.
 *
 * Three input shapes are supported, auto-detected by structure:
 *
 * 1. Native three.js AnimationClip JSON (e.g. produced by
 *    `AnimationClip.toJSON()`, which is what the FBX-upload flow in
 *    Dashboard -> Animations produces): `{ name, duration, tracks: [{ name, type, times, values }] }`.
 *    Passed straight to `THREE.AnimationClip.parse`.
 *
 * 2. A simplified per-bone keyframe schema:
 *    `{ name, duration, bones: [{ name, times: number[], quaternions?: number[][], positions?: number[][] }] }`
 *    where `quaternions`/`positions` are arrays of [x,y,z,w] / [x,y,z] per
 *    keyframe time. Rebuilt into proper three.js keyframe tracks.
 *
 * 3. Baked per-frame export (confirmed real-world format, see
 *    lib/json/*.json samples): `{ fps, duration, frames: [{ time, bones: {
 *    "mixamorig:BoneName": { position?: [x,y,z], rotationEuler?: [x,y,z] }
 *    } }] }`, with rotation in degrees and (root) position in centimeters.
 *    Converted to quaternion/position keyframe tracks — see the CM_TO_M and
 *    EULER_ORDER constants below if a previewed pose comes out wrong.
 */

interface ThreeClipJSON {
  name?: string;
  duration?: number;
  tracks: Array<{ name: string; type?: string; times: number[]; values: number[] }>;
}

interface SimpleBoneTrack {
  name: string;
  times: number[];
  quaternions?: number[][];
  positions?: number[][];
}

interface SimpleClipJSON {
  name?: string;
  duration?: number;
  bones: SimpleBoneTrack[];
}

interface FramesBonePose {
  position?: [number, number, number];
  rotationEuler?: [number, number, number];
}

interface FramesClipJSON {
  name?: string;
  fps?: number;
  duration?: number;
  frames: Array<{ time: number; bones: Record<string, FramesBonePose> }>;
}

function isThreeClipJSON(json: unknown): json is ThreeClipJSON {
  return !!json && typeof json === "object" && Array.isArray((json as ThreeClipJSON).tracks);
}

function isSimpleClipJSON(json: unknown): json is SimpleClipJSON {
  return !!json && typeof json === "object" && Array.isArray((json as SimpleClipJSON).bones);
}

function isFramesClipJSON(json: unknown): json is FramesClipJSON {
  return !!json && typeof json === "object" && Array.isArray((json as FramesClipJSON).frames);
}

// Real exports (see lib/json/*.json) give Hips.position in centimeters
// (Mixamo's native unit), same as the avatar mesh itself. We deliberately
// do NOT convert to meters here — the Hips bone is a child of the avatar's
// root object, which components/three/useQuickMagicModel.ts scales by 0.01 for
// the same reason, and since that parent scale already converts every child
// bone's local position into correct world-space meters, converting here
// too would scale root motion down twice (0.01 * 0.01). Keep this comment
// and useQuickMagicModel's AVATAR_SCALE in sync if either changes.

// Real exports use Euler order 'XYZ' (three.js's default). If a previewed
// pose looks twisted/wrong at the shoulders or hips, this is the second
// thing to try flipping (e.g. to 'ZYX').
const EULER_ORDER: THREE.EulerOrder = "XYZ";

// Confirmed by parsing an actual uploaded avatar FBX through THREE's
// FBXLoader: it strips the colon from Mixamo's raw node names, so
// "mixamorig:Hips" in the FBX becomes an Object3D named "mixamorigHips" in
// the loaded scene. Animation JSON exports that keep the colon (like
// lib/json/*.json) would then build tracks (e.g.
// "mixamorig:Hips.quaternion") that never match any node in the avatar's
// hierarchy — AnimationMixer's PropertyBinding fails to bind them silently
// (no error, the bone just never moves), which is exactly the "animation
// doesn't display correctly" symptom. Strip it here so track names always
// match what FBXLoader-loaded avatars are actually named.
function sanitizeBoneName(name: string): string {
  return name.replace(/:/g, "");
}

export function toAnimationClip(json: unknown, glossName: string): THREE.AnimationClip {
  if (isThreeClipJSON(json)) {
    return THREE.AnimationClip.parse(json as unknown as Parameters<typeof THREE.AnimationClip.parse>[0]);
  }

  if (isSimpleClipJSON(json)) {
    const tracks: THREE.KeyframeTrack[] = [];

    for (const bone of json.bones) {
      const targetName = sanitizeBoneName(bone.name);
      if (bone.quaternions) {
        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${targetName}.quaternion`,
            bone.times,
            bone.quaternions.flat()
          )
        );
      }
      if (bone.positions) {
        tracks.push(
          new THREE.VectorKeyframeTrack(`${targetName}.position`, bone.times, bone.positions.flat())
        );
      }
    }

    const duration =
      json.duration ?? Math.max(0, ...json.bones.flatMap((b) => b.times), 0);

    return new THREE.AnimationClip(json.name ?? glossName, duration, tracks);
  }

  if (isFramesClipJSON(json)) {
    const times = json.frames.map((f) => f.time);
    const boneNames = new Set<string>();
    for (const frame of json.frames) {
      for (const name of Object.keys(frame.bones)) boneNames.add(name);
    }

    const tracks: THREE.KeyframeTrack[] = [];
    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (const boneName of boneNames) {
      const quaternionValues: number[] = [];
      const positionValues: number[] = [];
      let hasPosition = false;

      for (const frame of json.frames) {
        const pose = frame.bones[boneName];
        const [rx, ry, rz] = pose?.rotationEuler ?? [0, 0, 0];
        euler.set(
          THREE.MathUtils.degToRad(rx),
          THREE.MathUtils.degToRad(ry),
          THREE.MathUtils.degToRad(rz),
          EULER_ORDER
        );
        quat.setFromEuler(euler);
        quaternionValues.push(quat.x, quat.y, quat.z, quat.w);

        if (pose?.position) {
          hasPosition = true;
          const [px, py, pz] = pose.position;
          // Left in centimeters on purpose — see the comment above.
          positionValues.push(px, py, pz);
        }
      }

      const targetName = sanitizeBoneName(boneName);
      tracks.push(new THREE.QuaternionKeyframeTrack(`${targetName}.quaternion`, times, quaternionValues));
      if (hasPosition) {
        tracks.push(new THREE.VectorKeyframeTrack(`${targetName}.position`, times, positionValues));
      }
    }

    return new THREE.AnimationClip(json.name ?? glossName, json.duration ?? times.at(-1) ?? 0, tracks);
  }

  throw new Error(
    `Unrecognized animation JSON shape for gloss "${glossName}". Expected a three.js AnimationClip JSON ({ tracks: [...] }), a simple per-bone schema ({ bones: [...] }), or a baked per-frame export ({ frames: [...] }).`
  );
}
