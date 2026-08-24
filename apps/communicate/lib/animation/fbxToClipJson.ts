import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

/**
 * Parses an uploaded Mixamo animation .fbx file (as an ArrayBuffer) into its
 * THREE.AnimationClip(s). Runs entirely in the browser — FBXLoader assumes a
 * browser-like environment, and this also means the (often multi-MB) FBX
 * binary never has to be sent to our server, only the small converted JSON.
 */
export function parseFbxToClips(buffer: ArrayBuffer): THREE.AnimationClip[] {
  const loader = new FBXLoader();
  const group = loader.parse(buffer, "");
  return group.animations ?? [];
}

/** Every unique bone/object name referenced by a clip's keyframe tracks. */
export function boneNamesFromClip(clip: THREE.AnimationClip): string[] {
  const names = clip.tracks.map((track) => {
    // Track names are "<nodeName>.<property>" (e.g. "mixamorigHips.quaternion").
    const dot = track.name.lastIndexOf(".");
    return dot === -1 ? track.name : track.name.slice(0, dot);
  });
  return Array.from(new Set(names));
}

/**
 * Serializes a clip to the same native three.js AnimationClip JSON shape
 * that lib/animation/mixamoJsonToClip.ts already deserializes on playback
 * via THREE.AnimationClip.parse() — so no playback-side changes are needed.
 */
export function clipToStoredJson(clip: THREE.AnimationClip): unknown {
  return clip.toJSON();
}
