"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFrame, useThree } from "@react-three/fiber";

/* ------------------------------------------------------------------ */
/*  Avatars                                                           */
/* ------------------------------------------------------------------ */

export interface AvatarConfig {
  id: AvatarId;
  label: string;
  /** Folder under `public/` holding the FBX and its textures. */
  dir: string;
  file: string;
  /**
   * Texture files that actually exist in the folder. There's no directory
   * listing over static hosting, so the manifest is explicit — which is also
   * what lets us tell "the FBX asked for a file we don't have" apart from
   * "the file is there under a slightly different name".
   */
  textures: readonly string[];
  /**
   * Texture to sample an average skin tone from, for materials that end up
   * without a diffuse map. Null when the export has no body atlas, in which
   * case the constant fallback tone is used instead.
   */
  skinSource: string | null;
  /**
   * UV of the head mesh's nose-tip vertex, measured off the geometry. Only
   * needed when the face has to be substituted — it anchors the drawn mouth
   * and nostrils. Null for avatars that ship a real head map.
   */
  noseUv: { u: number; v: number } | null;
  /** Short note shown in the UI about what this export is missing. */
  note?: string;
}

export type AvatarId = "girl" | "boy";

export const AVATARS: Record<AvatarId, AvatarConfig> = {
  girl: {
    id: "girl",
    label: "Girl",
    dir: "/models/A",
    file: "A_GirlFBX  T.fbx",
    textures: [
      "F1_000_Hair_Diff.png",
      "F1_001_Body_Diff.png",
      "F1_001_Eye_Diff.png",
      // The original head and jacket maps, recovered from QuickMagic after the
      // first export shipped without them. Verified as the genuine pair: the
      // six textures alongside them are byte-identical to the ones already
      // here, so it's the same character and the same UV set.
      "F1_001_Head_Diff.png",
      "F1_002_Jacket_Diff.png",
      "F1_002_Pants_Diff.png",
      "F1_002_Shoes_Diff.png",
      "F1_002_Socks_Diff.png",
    ],
    skinSource: "F1_001_Body_Diff.png",
    // Kept for the record, but inert now that a real head map exists — the
    // substitute bake only fires when the head material ends up without one.
    noseUv: { u: 0.4997, v: 0.4789 },
    note: "Complete texture set.",
  },
  boy: {
    id: "boy",
    label: "Boy",
    dir: "/models/B",
    file: "VideoEditor_202_BoyFBX.fbx",
    textures: [
      "M1_000_Hair_Diff.png",
      "M1_001_Eye_Diff.png",
      "M1_001_Head_Diff.png",
      "M1_002_Jacket_Diff.png",
      "M1_002_Pants_Diff.png",
      "M1_002_Shoes_Diff.png",
    ],
    // This export has no body atlas, so exposed skin falls back to a tone.
    skinSource: null,
    // Ships a real head map, so nothing is drawn on.
    noseUv: null,
    note: "No body-skin map — bare skin uses a flat tone.",
  },
};

export const DEFAULT_AVATAR: AvatarId = "girl";

/** Absolute URL of an avatar's FBX. */
export function avatarUrl(avatar: AvatarConfig): string {
  return `${avatar.dir}/${encodeURIComponent(avatar.file)}`;
}

/** 1×1 transparent PNG. Handed to the loader for texture paths we can't satisfy. */
const MISSING_TEXTURE_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Flat tones for materials whose diffuse map simply isn't in the export.
 * QuickMagic shipped this character without `F1_001_Head_Diff.png` (the
 * face) or `F1_002_Jacket_Diff.png` (the top), so those two need *some*
 * believable colour or they render as untextured white.
 *
 * The head entry is a placeholder — it gets overwritten at load time with a
 * tone sampled from the body texture, so the face always matches the arms
 * rather than drifting to whatever constant we happened to pick.
 */
const FALLBACK_TONES: Record<string, number> = {
  head: 0xf1d7c6,
  face: 0xf1d7c6,
  // The boy export's exposed-skin material is named "Body"; without its atlas
  // it would otherwise land on the neutral grey and read as a mannequin.
  body: 0xf1d7c6,
  glove: 0xf1d7c6,
  sock: 0xe6e6e6,
  jacket: 0x2f3238,
  default: 0xbfbfbf,
};

/**
 * The FBX's own diffuse colour on every material is #969696 — a mid grey
 * that *multiplies* over the diffuse map and drags the whole character 41%
 * darker. Textured materials get forced back to white.
 */
const NEUTRAL_TINT = 0xffffff;

/** Map slots FBXLoader may populate; all get swept for unresolved textures. */
const MAP_SLOTS = [
  "map",
  "bumpMap",
  "normalMap",
  "specularMap",
  "emissiveMap",
  "alphaMap",
  "aoMap",
  "lightMap",
] as const;

/* ------------------------------------------------------------------ */
/*  Public types                                                      */
/* ------------------------------------------------------------------ */

export interface LoadOptions {
  /**
   * Drop the FBX's `color` vertex attribute. This is the fix for the red
   * skin — see stripVertexColors() for the full story. Exposed as a toggle
   * purely so the broken state can be reproduced side by side.
   */
  stripVertexColors: boolean;
  /** Weld duplicate vertices and index the geometry (the size win). */
  weldVertices: boolean;
  /** Discard authored normals and rebuild them. Off by default — it wrecks stylised faces. */
  recomputeNormals: boolean;
  /**
   * Bake a substitute head diffuse map out of the mesh's own concavity, so
   * the nose, mouth and eye sockets show up despite `F1_001_Head_Diff.png`
   * never being exported. See bakeFaceTexture().
   */
  bakeFaceDetail: boolean;
}

export type TextureStatus = "resolved" | "renamed" | "missing" | "invalid-path";

export interface TextureReport {
  /** Path exactly as written inside the FBX. */
  requested: string;
  /** File we actually served, if any. */
  resolved: string | null;
  status: TextureStatus;
  note: string;
}

export interface MaterialReport {
  name: string;
  meshName: string;
  /** Diffuse map filename, or null when it was substituted with a flat tone. */
  mapFile: string | null;
  substituted: boolean;
  /** Raw diffuse colour the FBX carried, before neutralisation. */
  originalColor: string;
  material: THREE.MeshPhongMaterial;
}

export interface ModelStats {
  meshCount: number;
  boneCount: number;
  /** Vertex count as the FBX stored it (unindexed). */
  rawVertexCount: number;
  /** Vertex count after welding — equal to raw when welding is off. */
  vertexCount: number;
  triangleCount: number;
  /** Attribute bytes before optimisation. */
  rawBytes: number;
  /** Attribute bytes after stripping vertex colours + welding. */
  optimizedBytes: number;
}

export interface QuickMagicModel {
  scene: THREE.Group;
  mixer: THREE.AnimationMixer;
  bones: THREE.Bone[];
  clips: THREE.AnimationClip[];
  materials: MaterialReport[];
  textures: TextureReport[];
  stats: ModelStats;
  /** Options this build was produced with — lets callers spot a pending rebuild. */
  appliedOptions: LoadOptions;
}

/* ------------------------------------------------------------------ */
/*  Texture resolution                                                */
/* ------------------------------------------------------------------ */

/** Lowercase, drop the extension, and squeeze out whitespace. */
function normalizeTextureKey(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.(png|jpe?g|tga|bmp|dds|psd)$/i, "")
    .replace(/\s+/g, "");
}

function manifestByKey(avatar: AvatarConfig): Map<string, string> {
  return new Map(avatar.textures.map((f) => [normalizeTextureKey(f), f] as const));
}

/**
 * Resolves a texture path from inside the FBX against the files on disk.
 *
 * Three things in this particular export need forgiving:
 *  - every path is prefixed `../`, pointing one level above the model;
 *  - the hair map is referenced as `F1_000_Hair_Diff .png` — note the space
 *    before the extension — while the file on disk has no space;
 *  - one "texture" is `D:/wai_project/BatchBVHToFBX/res/max/girl_skin_max`,
 *    an absolute path from the exporting machine with no extension at all.
 *
 * Matching on a normalised basename absorbs the first two. The third can
 * only be reported.
 */
function resolveTexture(
  requestedPath: string,
  manifest: Map<string, string>
): TextureReport {
  const basename = requestedPath.split(/[/\\]/).pop() ?? requestedPath;
  const hasExtension = /\.(png|jpe?g|tga|bmp|dds|psd)$/i.test(basename);

  if (!hasExtension) {
    return {
      requested: requestedPath,
      resolved: null,
      status: "invalid-path",
      note: "Absolute path from the exporting machine, no file extension — unusable anywhere but the original workstation.",
    };
  }

  const key = normalizeTextureKey(basename);
  const match = manifest.get(key);

  if (!match) {
    return {
      requested: requestedPath,
      resolved: null,
      status: "missing",
      note: "Referenced by the FBX but absent from the export — substituted with a flat tone.",
    };
  }

  if (match !== basename) {
    return {
      requested: requestedPath,
      resolved: match,
      status: "renamed",
      note: `Matched "${match}" after normalising whitespace/case.`,
    };
  }

  return {
    requested: requestedPath,
    resolved: match,
    status: "resolved",
    note: "Matched directly.",
  };
}

/* ------------------------------------------------------------------ */
/*  Geometry fixes                                                    */
/* ------------------------------------------------------------------ */

/**
 * THE fix for the red character.
 *
 * QuickMagic's 3ds Max exporter writes a per-vertex `Color` layer that is
 * not artist-authored vertex colour — it's a leftover map channel. Its
 * values are junk in the red channel: the head averages (0.77, 0.01, 0.01),
 * the gloves are a flat (1.00, 0.01, 0.00), the eyes and shoes are (0,0,0).
 *
 * FBXLoader has no way to tell that apart from real vertex colour, so on
 * seeing a `color` attribute it sets `material.vertexColors = true`. The
 * shader then multiplies that junk over the diffuse map: skin turns red,
 * the (genuinely brown) hair texture is crushed to near-black, and the eyes
 * and shoes go pure black. Every "wrong colour" symptom on this model comes
 * from this one attribute.
 *
 * Deleting it also drops 3 floats per vertex — on a 37,872-vertex model
 * that's ~444 KB of buffer nobody wanted.
 */
function stripVertexColors(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    mesh.geometry?.deleteAttribute("color");
    for (const mat of materialsOf(mesh)) {
      mat.vertexColors = false;
      mat.needsUpdate = true;
    }
  });
}

/**
 * Welds duplicate vertices and indexes the geometry.
 *
 * The FBX stores every mesh unindexed — 37,872 vertices for 12,624
 * triangles, i.e. exactly 3 per triangle with nothing shared. Welding
 * reclaims the sharing and cuts the vertex buffers roughly threefold.
 *
 * Normals stay in the hash deliberately. Hashing on them means vertices are
 * only merged where position, UV, skin binding *and* shading all agree, so
 * authored hard edges survive intact. Dropping the normal attribute first
 * would weld more aggressively but forces a full normal rebuild afterwards,
 * which is exactly the thing that mangles a stylised face (see
 * `recomputeNormals`).
 */
function weldGeometry(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!mesh.geometry || mesh.geometry.getIndex()) return;

    try {
      const merged = mergeVertices(mesh.geometry, 1e-4);
      mesh.geometry.dispose();
      mesh.geometry = merged;
    } catch {
      // Exotic attribute layouts aren't mergeable. A mesh that stays
      // unindexed still renders correctly — it just misses the saving.
    }
  });
}

/**
 * Drops authored normals and rebuilds them from topology, welding first so
 * seam vertices actually merge (`mergeVertices` hashes normals, so stale
 * mismatched ones would prevent the weld this fix depends on).
 *
 * Off by default. It was originally added on the theory that rebuilt normals
 * were causing the blotchy shading across this character's face — that turned
 * out to be wrong. Rendering the head with authored normals, with welded
 * normals, and with fully rebuilt normals produces visually identical
 * faceting. The facets are simply a 2,766-triangle head displayed with no
 * diffuse map at all (`F1_001_Head_Diff.png` was never exported), so raw
 * geometric shading has nothing to hide behind. No normal strategy fixes
 * that; only the missing texture will.
 *
 * Kept as a toggle because it is the right fix for a *different* failure —
 * a mesh that genuinely arrives with broken or missing normals — and this is
 * a workbench for diagnosing imports.
 */
function recomputeNormals(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!mesh.geometry) return;
    mesh.geometry.deleteAttribute("normal");
    mesh.geometry.computeVertexNormals();
  });
}

/* ------------------------------------------------------------------ */
/*  Material fixes                                                    */
/* ------------------------------------------------------------------ */

function materialsOf(mesh: THREE.Mesh): THREE.MeshPhongMaterial[] {
  const raw = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return raw as THREE.MeshPhongMaterial[];
}

/** Safety valve so a wedged image request can't hang the whole load. */
const TEXTURE_WAIT_TIMEOUT_MS = 10_000;

/**
 * Resolves once every texture the FBX kicked off has finished loading.
 *
 * This await is load-bearing, not a nicety. `TextureLoader.load()` returns a
 * `Texture` immediately but only assigns `texture.image` inside the
 * `ImageLoader` callback, which fires a tick later. Inspecting
 * `texture.image` straight after `parse()` therefore sees `undefined` on
 * *every* texture — which would make the placeholder check below reject all
 * of them and leave the whole character untextured.
 *
 * FBXLoader registers all its texture requests synchronously during
 * `parse()`, so by the time we get here `itemsTotal` is final and no image
 * callback can have run yet. Failed loads count toward completion via
 * `itemEnd`, so errors settle this too.
 */
function waitForTextures(manager: THREE.LoadingManager): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, TEXTURE_WAIT_TIMEOUT_MS);
    // Never fires when the FBX referenced no textures at all — the timeout
    // covers that case.
    manager.onLoad = done;
  });
}

/**
 * True when a texture didn't come from a real file — either it was handed
 * our transparent placeholder, or its request failed outright and it never
 * received an image. Only meaningful after `waitForTextures()`.
 */
function isPlaceholder(texture: THREE.Texture | null): boolean {
  const image = texture?.image as HTMLImageElement | undefined;
  if (!image) return true;
  return typeof image.src === "string" && image.src.startsWith("data:");
}

/**
 * Picks a flat tone for a material with no usable diffuse map, keyed off the
 * material or mesh name (`Head`, `Jacket`, …).
 */
function fallbackToneFor(materialName: string, meshName: string): number {
  const haystack = `${materialName} ${meshName}`.toLowerCase();
  for (const key of Object.keys(FALLBACK_TONES)) {
    if (key !== "default" && haystack.includes(key)) return FALLBACK_TONES[key];
  }
  return FALLBACK_TONES.default;
}

/**
 * Tunes every texture for a web viewport: correct colour space (skipping it
 * is the classic washed-out-character bug), mipmaps so the character doesn't
 * shimmer when small, and max anisotropy so the pants/shoes detail holds up
 * at grazing angles. These maps are already 256–512px, so there's nothing to
 * gain from downscaling — the wins here are all in sampling quality.
 */
function tuneTexture(texture: THREE.Texture, maxAnisotropy: number): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

/**
 * Neutralises the FBX's grey tint, clears out any map slot that resolved to
 * our placeholder, and drops a flat tone on whatever is left mapless.
 */
function fixMaterials(group: THREE.Group, maxAnisotropy: number): MaterialReport[] {
  const reports: MaterialReport[] = [];
  const seen = new Set<string>();

  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    for (const mat of materialsOf(mesh)) {
      if (seen.has(mat.uuid)) continue;
      seen.add(mat.uuid);

      const originalColor = mat.color ? `#${mat.color.getHexString()}` : "n/a";

      // Sweep unresolved textures out of every slot. Leaving a placeholder
      // bound would render the mesh transparent-black rather than showing
      // the fallback colour underneath.
      for (const slot of MAP_SLOTS) {
        const texture = mat[slot] as THREE.Texture | null | undefined;
        if (!texture) continue;
        if (isPlaceholder(texture)) {
          texture.dispose();
          (mat[slot] as THREE.Texture | null) = null;
        } else {
          tuneTexture(texture, maxAnisotropy);
        }
      }

      const substituted = !mat.map;

      if (substituted) {
        mat.color.setHex(fallbackToneFor(mat.name, mesh.name));
      } else {
        // Undo the #969696 multiply so the texture shows at true value.
        mat.color.setHex(NEUTRAL_TINT);
      }

      // The export sets a specular highlight on skin and cloth alike. On a
      // flat-shaded stylised character that reads as wet plastic.
      mat.specular?.setHex(0x000000);
      mat.emissive?.setHex(0x000000);
      mat.shininess = 0;
      mat.needsUpdate = true;

      const mapSrc = (mat.map?.image as HTMLImageElement | undefined)?.src;

      reports.push({
        name: mat.name || `Material ${mat.uuid.slice(0, 8)}`,
        meshName: mesh.name,
        mapFile: mapSrc ? decodeURIComponent(mapSrc.split("/").pop() ?? "") : null,
        substituted,
        originalColor,
        material: mat,
      });
    }
  });

  return reports;
}

/**
 * Reads an average skin tone off the body texture.
 *
 * Sampling beats hardcoding because it stays correct if the body texture is
 * ever swapped for a different skin tone — the face follows automatically
 * instead of drifting out of match with the arms. Returned in sRGB (as a
 * plain hex) so the bake below can use it as a clear colour directly.
 */
async function sampleSkinTone(avatar: AvatarConfig): Promise<number | null> {
  if (!avatar.skinSource) return FALLBACK_TONES.head;
  try {
    const response = await fetch(`${avatar.dir}/${avatar.skinSource}`);
    const bitmap = await createImageBitmap(await response.blob());

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    bitmap.close();

    // Skip near-black pixels: the atlas has unused margins and a dark strip
    // of hairline detail that would drag the average down.
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] + data[i + 1] + data[i + 2] < 90) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (n === 0) return null;

    return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Face detail bake                                                  */
/* ------------------------------------------------------------------ */

const CAVITY_GAIN = 7;
const CAVITY_SMOOTH_PASSES = 1;
const FACE_BAKE_SIZE = 1024;

/**
 * How dark a fully-occluded crease is allowed to go, as a fraction.
 *
 * This is a hard cap, not a multiplier, and that distinction matters. Eye
 * sockets saturate the cavity term at 1.0, so an uncapped multiplier drove
 * them to ~88% darkening — near black — which is where the "raccoon rings"
 * came from. Capped at 0.25 the nose and mouth still read clearly while the
 * sockets stay as soft shading. Chosen from a side-by-side sweep of
 * 0 / 0.15 / 0.25 / 0.38.
 */
const CAVITY_MAX_DARKENING = 0.25;

/** Same idea applied to the hands — see applyCavityToHands(). */
const HAND_MAX_DARKENING = 0.3;

/**
 * UV of the head mesh's nose-tip vertex, measured off the geometry itself
 * (the frontmost vertex on the centre line at nose height). The drawn mouth
 * and nostrils below are all positioned relative to this, so they stay
 * correct without hardcoding atlas coordinates by eye.
 */

/** How dark the drawn mouth/nostril strokes go, as a fraction of skin tone. */
const FACE_LINE_STRENGTH = 0.34;

/**
 * Draws the mouth and nostrils onto the baked head texture.
 *
 * The cavity bake alone can't do this. The mouth spans only a handful of the
 * head's 2,766 triangles, so a per-vertex crease value gets interpolated
 * across those large triangles into a soft smudge rather than a line — I
 * measured this and raising the crease weight just darkened the whole lower
 * face without ever producing a readable mouth. Drawing into the atlas at
 * texel resolution is the only way to get a crisp line on geometry this
 * coarse.
 *
 * Everything is anchored to NOSE_UV so the placement follows the model
 * rather than magic numbers.
 */
function drawFaceLines(
  ctx: CanvasRenderingContext2D,
  size: number,
  skinHex: number,
  NOSE_UV: { u: number; v: number }
): void {
  const skin = new THREE.Color(skinHex);
  const shade = (amount: number) =>
    `rgb(${Math.round(skin.r * 255 * (1 - amount))},${Math.round(
      skin.g * 255 * (1 - amount)
    )},${Math.round(skin.b * 255 * (1 - amount))})`;

  const X = (u: number) => u * size;
  const Y = (v: number) => (1 - v) * size;
  const S = FACE_LINE_STRENGTH;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Mouth: a shallow upward curve, with a softer shadow under it so it reads
  // as lips rather than a scratch.
  const mouthV = NOSE_UV.v - 0.094;
  const halfWidth = 0.047;

  ctx.filter = "blur(1.6px)";
  ctx.strokeStyle = shade(S);
  ctx.lineWidth = size * 0.0042;
  ctx.beginPath();
  ctx.moveTo(X(NOSE_UV.u - halfWidth), Y(mouthV + 0.004));
  ctx.quadraticCurveTo(X(NOSE_UV.u), Y(mouthV - 0.0055), X(NOSE_UV.u + halfWidth), Y(mouthV + 0.004));
  ctx.stroke();

  ctx.filter = "blur(5px)";
  ctx.strokeStyle = shade(S * 0.32);
  ctx.lineWidth = size * 0.01;
  ctx.beginPath();
  ctx.moveTo(X(NOSE_UV.u - halfWidth * 0.82), Y(mouthV - 0.013));
  ctx.quadraticCurveTo(
    X(NOSE_UV.u),
    Y(mouthV - 0.022),
    X(NOSE_UV.u + halfWidth * 0.82),
    Y(mouthV - 0.013)
  );
  ctx.stroke();

  // Nose: two nostril ticks plus a soft shadow under the tip.
  const noseV = NOSE_UV.v - 0.027;

  ctx.filter = "blur(1.3px)";
  ctx.strokeStyle = shade(S * 0.9);
  ctx.lineWidth = size * 0.0035;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(X(NOSE_UV.u + side * 0.0125), Y(noseV + 0.005));
    ctx.quadraticCurveTo(
      X(NOSE_UV.u + side * 0.019),
      Y(noseV),
      X(NOSE_UV.u + side * 0.013),
      Y(noseV - 0.005)
    );
    ctx.stroke();
  }

  ctx.filter = "blur(6px)";
  ctx.strokeStyle = shade(S * 0.3);
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.moveTo(X(NOSE_UV.u - 0.022), Y(noseV - 0.004));
  ctx.quadraticCurveTo(X(NOSE_UV.u), Y(noseV - 0.012), X(NOSE_UV.u + 0.022), Y(noseV - 0.004));
  ctx.stroke();

  ctx.restore();
}

/**
 * Per-vertex concavity ("cavity"), the standard cheap alternative to a full
 * AO bake.
 *
 * For each vertex, average `dot(normal, direction to neighbour)`. On a convex
 * surface neighbours fall below the tangent plane and the average is
 * negative; in a crease they rise above it and it goes positive. Clamping to
 * the positive side leaves exactly the creases: nostrils, the mouth line, eye
 * sockets, the ear folds.
 *
 * Requires indexed geometry to know who neighbours whom.
 */
function computeCavity(geometry: THREE.BufferGeometry, gain: number, passes: number): Float32Array {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  const count = position.count;

  const adjacency: Set<number>[] = Array.from({ length: count }, () => new Set<number>());
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      adjacency[a].add(b); adjacency[a].add(c);
      adjacency[b].add(a); adjacency[b].add(c);
      adjacency[c].add(a); adjacency[c].add(b);
    }
  }

  let cavity = new Float32Array(count);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const d = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    let sum = 0;
    let seen = 0;
    for (const j of adjacency[i]) {
      d.fromBufferAttribute(position, j).sub(p);
      const length = d.length();
      if (length < 1e-8) continue;
      sum += d.divideScalar(length).dot(n);
      seen++;
    }
    cavity[i] = seen ? Math.max(0, Math.min(1, (sum / seen) * gain)) : 0;
  }

  // A light blur keeps single-vertex spikes from reading as speckle.
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let sum = cavity[i];
      let seen = 1;
      for (const j of adjacency[i]) {
        sum += cavity[j];
        seen++;
      }
      next[i] = sum / seen;
    }
    cavity = next;
  }

  return cavity;
}

/**
 * Bakes a diffuse texture for the head out of the mesh's own geometry.
 *
 * `F1_001_Head_Diff.png` was never exported, so the face had no nose, mouth
 * or any other feature — just flat skin. Rather than guess where those belong
 * in UV space, this derives them from the model: the nose crease, lips and
 * eye sockets are all *already modelled*, so baking concavity into the
 * texture puts the shading exactly where the geometry's creases are, by
 * construction.
 *
 * The trick is the vertex shader, which writes UV straight into clip space —
 * so the mesh rasterises into its own texture atlas rather than into a view.
 *
 * Note this is a substitute, not a recreation: it recovers form, not artwork.
 * Painted detail from the original map (blush, lip colour, brow shading)
 * cannot be recovered and would still need the real file.
 */
function bakeCavityTexture(
  geometry: THREE.BufferGeometry,
  base: number | THREE.Texture,
  maxDarkening: number,
  renderer: THREE.WebGLRenderer,
  options: { noseUv?: { u: number; v: number } | null; lineSkinHex?: number } = {}
): THREE.Texture | null {
  const baseTexture = base instanceof THREE.Texture ? base : null;
  const baseHex = typeof base === "number" ? base : 0xffffff;
  // Adjacency needs an index buffer. When the weld toggle is off the display
  // geometry is unindexed, so weld a throwaway copy — UVs are part of the
  // merge key, so the atlas layout is untouched and the bake stays valid.
  let source = geometry;
  let temporary: THREE.BufferGeometry | null = null;
  if (!geometry.getIndex()) {
    try {
      temporary = mergeVertices(geometry.clone(), 1e-4);
      source = temporary;
    } catch {
      return null;
    }
  }

  const cavity = computeCavity(source, CAVITY_GAIN, CAVITY_SMOOTH_PASSES);
  const bakeGeometry = source.clone();
  bakeGeometry.setAttribute("cavity", new THREE.BufferAttribute(cavity, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: baseTexture },
      uColor: { value: new THREE.Color(baseTexture ? 0xffffff : baseHex) },
      uMaxDark: { value: maxDarkening },
    },
    defines: baseTexture ? { USE_BASE_TEX: "" } : {},
    vertexShader: `
      varying float vCavity;
      varying vec2 vBakeUv;
      attribute float cavity;
      void main() {
        vCavity = cavity;
        vBakeUv = uv;
        // Rasterise into UV space: uv 0..1 maps to clip -1..1.
        gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
      }`,
    fragmentShader: `
      #ifdef USE_BASE_TEX
      uniform sampler2D uBase;
      #endif
      uniform vec3 uColor;
      uniform float uMaxDark;
      varying float vCavity;
      varying vec2 vBakeUv;
      void main() {
        float shade = 1.0 - clamp(vCavity, 0.0, 1.0) * uMaxDark;
        vec3 base = uColor;
        #ifdef USE_BASE_TEX
        base = texture2D(uBase, vBakeUv).rgb;
        #endif
        gl_FragColor = vec4(base * shade, 1.0);
      }`,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  });

  // sRGB target is required, not cosmetic. The shader works in linear space;
  // without this the raw linear bytes get read back and then tagged sRGB on
  // the CanvasTexture, so they're decoded a second time and the whole face
  // comes out noticeably darker and more orange than the neck beside it.
  const target = new THREE.WebGLRenderTarget(FACE_BAKE_SIZE, FACE_BAKE_SIZE, {
    colorSpace: THREE.SRGBColorSpace,
  });
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(bakeGeometry, material);
  // The shader writes clip space itself, but culling still tests the real
  // bounding sphere (centred ~147 units up) against the identity frustum,
  // which would throw the whole mesh away before it rasterised.
  mesh.frustumCulled = false;
  scene.add(mesh);

  const previousTarget = renderer.getRenderTarget();
  const previousClear = new THREE.Color();
  renderer.getClearColor(previousClear);
  const previousAlpha = renderer.getClearAlpha();

  renderer.setRenderTarget(target);
  renderer.setClearColor(new THREE.Color(baseTexture ? 0x000000 : baseHex), 1);
  renderer.clear();

  if (baseTexture) {
    // Lay the untouched base map over the whole atlas first. Without it the
    // UV gutters stay black and mipmapping bleeds that black back into the
    // island edges — which showed up as a hard-edged dark quad across the
    // back of the hand.
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: baseTexture, depthTest: false, depthWrite: false })
    );
    fill.frustumCulled = false;
    const fillScene = new THREE.Scene();
    fillScene.add(fill);
    renderer.render(fillScene, new THREE.Camera());
    fill.geometry.dispose();
    fill.material.dispose();
  }

  renderer.autoClear = false;
  renderer.render(scene, new THREE.Camera());
  renderer.autoClear = true;

  const pixels = new Uint8Array(FACE_BAKE_SIZE * FACE_BAKE_SIZE * 4);
  renderer.readRenderTargetPixels(target, 0, 0, FACE_BAKE_SIZE, FACE_BAKE_SIZE, pixels);

  renderer.setRenderTarget(previousTarget);
  renderer.setClearColor(previousClear, previousAlpha);

  target.dispose();
  bakeGeometry.dispose();
  material.dispose();
  temporary?.dispose();

  // Copy into a CanvasTexture rather than handing back the render target's
  // texture: GLTFExporter serialises `texture.image`, which a render target
  // doesn't have, so the GLB export would otherwise lose the face entirely.
  const canvas = document.createElement("canvas");
  canvas.width = FACE_BAKE_SIZE;
  canvas.height = FACE_BAKE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(FACE_BAKE_SIZE, FACE_BAKE_SIZE);
  // readRenderTargetPixels starts at v=0 (bottom row); ImageData row 0 is the
  // top. Flip on copy so the default flipY sampling lines back up.
  const rowBytes = FACE_BAKE_SIZE * 4;
  for (let y = 0; y < FACE_BAKE_SIZE; y++) {
    image.data.set(
      pixels.subarray(y * rowBytes, (y + 1) * rowBytes),
      (FACE_BAKE_SIZE - 1 - y) * rowBytes
    );
  }
  ctx.putImageData(image, 0, 0);

  // Crisp features go on last, at texel resolution — see drawFaceLines().
  if (options.noseUv) {
    drawFaceLines(ctx, FACE_BAKE_SIZE, options.lineSkinHex ?? baseHex, options.noseUv);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Adds crease shading to the hands.
 *
 * The hand mesh is fine — separate fingers, modelled nails and knuckles —
 * but every one of them samples the same near-uniform patch of
 * `F1_001_Body_Diff.png`, so under this deliberately flat light rig there is
 * nothing separating one finger from the next and at normal viewing distance
 * the hand reads as a paddle. That matters more here than on most models,
 * because finger shape is the part a sign language avatar has to get across.
 *
 * Baking cavity *over* the existing body map (rather than replacing it)
 * keeps the nails and skin detail and just darkens the gaps between fingers.
 */
function applyCavityToHands(
  reports: MaterialReport[],
  group: THREE.Group,
  renderer: THREE.WebGLRenderer
): void {
  // The hands are the "Gloves" mesh in this export.
  const handReports = reports.filter((r) => r.meshName === "Gloves" && r.material.map);
  if (handReports.length === 0) return;

  const mesh = group.getObjectByName("Gloves") as THREE.Mesh | undefined;
  if (!mesh?.geometry) return;

  const baseTexture = handReports[0].material.map;
  if (!baseTexture) return;

  const texture = bakeCavityTexture(mesh.geometry, baseTexture, HAND_MAX_DARKENING, renderer);
  if (!texture) return;

  for (const report of handReports) {
    report.material.map = texture;
    report.material.needsUpdate = true;
    report.mapFile = `${report.mapFile} + baked creases`;
  }
}

/**
 * Gives every material that fell back to a flat tone its best available
 * substitute: the head gets a baked face texture, anything else keeps the
 * sampled skin tone.
 */
async function applyFaceSubstitute(
  reports: MaterialReport[],
  group: THREE.Group,
  renderer: THREE.WebGLRenderer,
  bakeEnabled: boolean,
  avatar: AvatarConfig
): Promise<void> {
  const headReports = reports.filter(
    (r) =>
      r.substituted && /head|face/i.test(`${r.name} ${r.meshName}`)
  );
  if (headReports.length === 0) return;

  const skinHex = await sampleSkinTone(avatar);
  if (skinHex === null) return;

  // Flat tone first: it's the correct result on its own if the bake is off,
  // and the fallback if the bake fails.
  for (const report of headReports) report.material.color.setHex(skinHex);
  if (!bakeEnabled) return;

  const headMesh = group.getObjectByName(headReports[0].meshName) as THREE.Mesh | undefined;
  if (!headMesh?.geometry) return;

  const texture = bakeCavityTexture(
    headMesh.geometry,
    skinHex,
    CAVITY_MAX_DARKENING,
    renderer,
    { noseUv: avatar.noseUv, lineSkinHex: skinHex }
  );
  if (!texture) return;

  for (const report of headReports) {
    report.material.map = texture;
    report.material.color.setHex(NEUTRAL_TINT);
    report.material.needsUpdate = true;
    report.substituted = false;
    report.mapFile = "baked from geometry";
  }

  applyCavityToHands(reports, group, renderer);
}

/* ------------------------------------------------------------------ */
/*  Stats                                                             */
/* ------------------------------------------------------------------ */

function attributeBytes(geometry: THREE.BufferGeometry): number {
  let bytes = 0;
  for (const attribute of Object.values(geometry.attributes)) {
    bytes += (attribute as THREE.BufferAttribute).array.byteLength;
  }
  const index = geometry.getIndex();
  if (index) bytes += index.array.byteLength;
  return bytes;
}

function computeStats(group: THREE.Group, rawVertexCount: number, rawBytes: number): ModelStats {
  let meshCount = 0;
  let boneCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  let optimizedBytes = 0;

  group.traverse((child) => {
    if ((child as THREE.Bone).isBone) boneCount++;
    if (!(child as THREE.Mesh).isMesh) return;
    const geometry = (child as THREE.Mesh).geometry;
    if (!geometry) return;

    meshCount++;
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    vertexCount += position?.count ?? 0;
    triangleCount += index ? index.count / 3 : (position?.count ?? 0) / 3;
    optimizedBytes += attributeBytes(geometry);
  });

  return {
    meshCount,
    boneCount,
    rawVertexCount,
    vertexCount,
    triangleCount: Math.round(triangleCount),
    rawBytes,
    optimizedBytes,
  };
}

/* ------------------------------------------------------------------ */
/*  Build                                                             */
/* ------------------------------------------------------------------ */

/** Mixamo/QuickMagic FBX is authored in centimetres; the scene is metres. */
const AVATAR_SCALE = 0.01;

/** Bind-pose stubs the exporter leaves behind aren't worth listing as clips. */
const MIN_USEFUL_CLIP_DURATION = 0.1;

async function buildModel(
  buffer: ArrayBuffer,
  options: LoadOptions,
  renderer: THREE.WebGLRenderer,
  avatar: AvatarConfig
): Promise<QuickMagicModel> {
  const manifest = manifestByKey(avatar);
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const manager = new THREE.LoadingManager();
  const textures: TextureReport[] = [];
  const seenPaths = new Set<string>();

  manager.setURLModifier((url) => {
    if (!seenPaths.has(url)) {
      seenPaths.add(url);
      textures.push(resolveTexture(url, manifest));
    }
    const report = textures.find((t) => t.requested === url);
    return report?.resolved ? `${avatar.dir}/${report.resolved}` : MISSING_TEXTURE_URL;
  });

  const group = new FBXLoader(manager).parse(buffer, "");
  group.scale.setScalar(AVATAR_SCALE);

  // Measure before touching anything, so the panel can show a real delta.
  let rawVertexCount = 0;
  let rawBytes = 0;
  group.traverse((child) => {
    const geometry = (child as THREE.Mesh).geometry;
    if (!(child as THREE.Mesh).isMesh || !geometry) return;
    rawVertexCount += geometry.getAttribute("position")?.count ?? 0;
    rawBytes += attributeBytes(geometry);
  });

  if (options.stripVertexColors) stripVertexColors(group);
  if (options.weldVertices) weldGeometry(group);
  if (options.recomputeNormals) recomputeNormals(group);

  // Must come before fixMaterials — see waitForTextures().
  await waitForTextures(manager);

  const materials = fixMaterials(group, maxAnisotropy);
  await applyFaceSubstitute(materials, group, renderer, options.bakeFaceDetail, avatar);

  const bones: THREE.Bone[] = [];
  group.traverse((child) => {
    if ((child as THREE.Bone).isBone) bones.push(child as THREE.Bone);
    if ((child as THREE.Mesh).isMesh) {
      // Skinned meshes get culled against their bind-pose bounds, which pops
      // limbs out of view mid-animation.
      (child as THREE.Mesh).frustumCulled = false;
    }
  });

  // The export carries two clips: a 0.03s "mixamo.com" bind-pose stub and
  // the real 3.5s "Take 001". Longest first, so the useful one plays by
  // default instead of a single frozen frame.
  const clips = (group.animations ?? [])
    .filter((clip) => clip.duration >= MIN_USEFUL_CLIP_DURATION)
    .sort((a, b) => b.duration - a.duration);

  return {
    scene: group,
    mixer: new THREE.AnimationMixer(group),
    bones,
    clips: clips.length > 0 ? clips : (group.animations ?? []),
    materials,
    textures,
    stats: computeStats(group, rawVertexCount, rawBytes),
    appliedOptions: options,
  };
}

/** Releases GPU resources for a model we're about to replace. */
function disposeModel(model: QuickMagicModel): void {
  model.mixer.stopAllAction();
  model.scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    for (const mat of materialsOf(mesh)) {
      for (const slot of MAP_SLOTS) {
        (mat[slot] as THREE.Texture | null | undefined)?.dispose();
      }
      mat.dispose();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface QuickMagicModelState {
  model: QuickMagicModel | null;
  error: string | null;
}

/**
 * Loads the fixed `models/A` QuickMagic export and applies the import fixes.
 *
 * The FBX is fetched once and the ArrayBuffer cached; flipping any option
 * re-parses from memory rather than hitting the network again, so toggling
 * fixes on and off to compare is instant.
 *
 * The previous model stays mounted while a rebuild runs, so toggling doesn't
 * flash an empty viewport. Callers wanting a "rebuilding" indicator can
 * compare their current options against `model.appliedOptions`.
 */
export function useQuickMagicModel(
  avatarId: AvatarId,
  options: LoadOptions
): QuickMagicModelState {
  const avatar = AVATARS[avatarId];
  const gl = useThree((state) => state.gl);
  const [state, setState] = useState<QuickMagicModelState>({ model: null, error: null });

  // Cached per avatar so switching back and forth doesn't refetch the FBX.
  const bufferCache = useRef<Map<AvatarId, ArrayBuffer>>(new Map());
  const modelRef = useRef<QuickMagicModel | null>(null);

  const {
    stripVertexColors: strip,
    weldVertices: weld,
    recomputeNormals: recompute,
    bakeFaceDetail: bakeFace,
  } = options;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        let buffer = bufferCache.current.get(avatarId);
        if (!buffer) {
          const url = avatarUrl(avatar);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
          buffer = await response.arrayBuffer();
          bufferCache.current.set(avatarId, buffer);
        }

        const built = await buildModel(
          buffer,
          {
            stripVertexColors: strip,
            weldVertices: weld,
            recomputeNormals: recompute,
            bakeFaceDetail: bakeFace,
          },
          gl,
          avatar
        );

        if (cancelled) {
          disposeModel(built);
          return;
        }

        if (modelRef.current) disposeModel(modelRef.current);
        modelRef.current = built;
        setState({ model: built, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({
          model: null,
          error: error instanceof Error ? error.message : "Failed to load the FBX.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gl, strip, weld, recompute, bakeFace, avatarId, avatar]);

  useEffect(() => {
    return () => {
      if (modelRef.current) disposeModel(modelRef.current);
      modelRef.current = null;
    };
  }, []);

  useFrame((_, delta) => {
    modelRef.current?.mixer.update(delta);
  });

  return state;
}
