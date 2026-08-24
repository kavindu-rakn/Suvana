/**
 * Generates procedural placeholder diffuse textures (skin + hair) for the
 * sign dictionary workbench (Dashboard -> Animations) — for when you don't
 * have real texture files yet and just want something better than a flat
 * "no map" fallback color to test material assignment with.
 *
 * These are generic, UV-layout-agnostic: all-over mottled noise rather than
 * anything positioned (cheeks/lips/etc.), since we don't know your model's
 * actual UV unwrap. Good enough for bone/animation testing; swap for real
 * artist textures before shipping.
 *
 * Usage:  npx tsx scripts/generatePlaceholderTextures.ts
 * Output: public/models/sample-textures/skin_diffuse.png
 *         public/models/sample-textures/hair_diffuse.png
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";

const OUT_DIR = path.join(__dirname, "..", "public", "models", "sample-textures");
const SIZE = 1024;

/** Seeded value-noise grid, bilinearly sampled — cheap, dependency-free procedural noise. */
function makeNoiseGrid(cellSize: number, width: number, height: number) {
  const gw = Math.ceil(width / cellSize) + 2;
  const gh = Math.ceil(height / cellSize) + 2;
  const grid: number[][] = [];
  for (let y = 0; y < gh; y++) {
    const row: number[] = [];
    for (let x = 0; x < gw; x++) row.push(Math.random());
    grid.push(row);
  }
  return { grid, cellSize };
}

function sampleNoise(noise: ReturnType<typeof makeNoiseGrid>, x: number, y: number): number {
  const { grid, cellSize } = noise;
  const gx = x / cellSize;
  const gy = y / cellSize;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const sx = gx - x0;
  const sy = gy - y0;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const n00 = grid[y0][x0];
  const n10 = grid[y0][x0 + 1];
  const n01 = grid[y0 + 1][x0];
  const n11 = grid[y0 + 1][x0 + 1];
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Creamy skin tone with subtle multi-octave mottling so it doesn't read as flat plastic. */
function generateSkinTexture(): Buffer {
  const base = { r: 232, g: 195, b: 160 }; // matches CREAMY_SKIN_FALLBACK in useFbxFromBuffer.ts
  const lowFreq = makeNoiseGrid(180, SIZE, SIZE);
  const midFreq = makeNoiseGrid(48, SIZE, SIZE);
  const highFreq = makeNoiseGrid(6, SIZE, SIZE);
  const blush = makeNoiseGrid(260, SIZE, SIZE);

  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const low = sampleNoise(lowFreq, x, y) - 0.5; // large soft blotches
      const mid = sampleNoise(midFreq, x, y) - 0.5; // medium mottling
      const high = sampleNoise(highFreq, x, y) - 0.5; // fine grain
      const blushAmt = Math.max(0, sampleNoise(blush, x, y) - 0.62) * 2.2; // rare warm patches

      const r = base.r + low * 14 + mid * 8 + high * 5 + blushAmt * 18;
      const g = base.g + low * 10 + mid * 6 + high * 5 - blushAmt * 6;
      const b = base.b + low * 8 + mid * 5 + high * 5 - blushAmt * 4;

      const i = (y * SIZE + x) * 4;
      buf[i] = clamp255(r);
      buf[i + 1] = clamp255(g);
      buf[i + 2] = clamp255(b);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/** Dark brown hair tone with vertical strand-like streaks. */
function generateHairTexture(): Buffer {
  const base = { r: 32, g: 22, b: 18 };
  // Stretched vertically (sampling y at reduced rate) so noise reads as
  // top-to-bottom strands rather than isotropic blotches.
  const strandFreq = makeNoiseGrid(10, SIZE, Math.ceil(SIZE * 0.12) + 4);
  const grainFreq = makeNoiseGrid(3, SIZE, SIZE);
  const highlightFreq = makeNoiseGrid(22, SIZE, Math.ceil(SIZE * 0.12) + 4);

  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const strand = sampleNoise(strandFreq, x, y * 0.12) - 0.5;
      const grain = sampleNoise(grainFreq, x, y) - 0.5;
      const highlight = Math.max(0, sampleNoise(highlightFreq, x, y * 0.12) - 0.65) * 2.8;

      const r = base.r + strand * 16 + grain * 6 + highlight * 22;
      const g = base.g + strand * 11 + grain * 5 + highlight * 15;
      const b = base.b + strand * 9 + grain * 5 + highlight * 12;

      const i = (y * SIZE + x) * 4;
      buf[i] = clamp255(r);
      buf[i + 1] = clamp255(g);
      buf[i + 2] = clamp255(b);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const skin = generateSkinTexture();
  const skinPath = path.join(OUT_DIR, "skin_diffuse.png");
  await sharp(skin, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(skinPath);
  console.log(`Wrote ${skinPath}`);

  const hair = generateHairTexture();
  const hairPath = path.join(OUT_DIR, "hair_diffuse.png");
  await sharp(hair, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(hairPath);
  console.log(`Wrote ${hairPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
