/**
 * Imports sign-language glosses and animation metadata into Communicate's MongoDB.
 *
 * Reads an exported JSON containing gloss tokens, Sinhala forms (synonyms),
 * animation URLs and Cloudinary public IDs.
 *
 * Default mode is DRY-RUN: validates and previews changes without touching MongoDB.
 * Pass --write or --apply to persist records to the database.
 *
 * Usage:
 *   npx tsx scripts/importGlosses.ts --file <path-to-json> [--remap-base <new-base-url>] [--write]
 *
 * Examples:
 *   # Dry-run inspection
 *   npx tsx scripts/importGlosses.ts --file export.json
 *
 *   # Dry-run with Cloudinary URL remapping
 *   npx tsx scripts/importGlosses.ts --file export.json --remap-base https://res.cloudinary.com/suvana-cloud/raw/upload
 *
 *   # Persist to MongoDB
 *   npx tsx scripts/importGlosses.ts --file export.json --remap-base https://res.cloudinary.com/suvana-cloud/raw/upload --write
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectDB } from "../lib/db";
import GlossModel from "../models/Gloss";

export interface RawGlossExportEntry {
  name?: string;
  gloss?: string;
  token?: string;
  glossName?: string;
  sinhalaForms?: string[] | string;
  sinhala_forms?: string[] | string;
  "Sinhala forms"?: string[] | string;
  synonyms?: string[] | string;
  forms?: string[] | string;
  animationUrl?: string;
  animation_url?: string;
  cloudinaryUrl?: string;
  url?: string;
  public_id?: string;
  publicId?: string;
  cloudinaryPublicId?: string;
  previewImage?: string;
  rig?: "mixamo" | "biped";
  sourceAvatar?: "girl" | "boy";
  duration?: number;
  boneCount?: number;
}

export interface NormalizedGlossRecord {
  gloss: string;
  synonyms: string[];
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  previewImage?: string;
  rig?: "mixamo" | "biped";
  sourceAvatar?: "girl" | "boy";
  duration?: number;
  boneCount?: number;
}

/**
 * Remaps an animation URL from an existing Cloudinary base to a new base URL.
 */
export function remapAnimationUrl(url: string, newBase: string, publicId?: string): string {
  if (!newBase || !url) return url;
  const trimmedBase = newBase.replace(/\/+$/, "");

  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx !== -1) {
    let afterUpload = url.slice(uploadIdx + "/upload/".length).replace(/^\/+/, "");

    // If newBase already specifies a subdirectory like ".../sign-glosses" and afterUpload starts with "sign-glosses/"
    if (trimmedBase.endsWith("/sign-glosses") && afterUpload.startsWith("sign-glosses/")) {
      afterUpload = afterUpload.slice("sign-glosses/".length);
    }

    if (trimmedBase.endsWith("/upload")) {
      return `${trimmedBase}/${afterUpload}`;
    }
    if (!trimmedBase.includes("/upload")) {
      return `${trimmedBase}/raw/upload/${afterUpload}`;
    }
    return `${trimmedBase}/${afterUpload}`;
  }

  // Fallback if URL is not a standard Cloudinary /upload/ link
  const fileName = publicId
    ? publicId.endsWith(".json")
      ? publicId
      : `${publicId}.json`
    : url.split("/").pop() || "";

  if (trimmedBase.endsWith("/sign-glosses") && fileName.startsWith("sign-glosses/")) {
    return `${trimmedBase}/${fileName.slice("sign-glosses/".length)}`;
  }
  return `${trimmedBase}/${fileName}`;
}

/**
 * Parses and normalizes raw JSON data containing gloss exports into validated records.
 */
export function parseExportedGlosses(
  rawContent: string,
  remapBase?: string
): NormalizedGlossRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to parse JSON content: ${(err as Error).message}`);
  }

  let entries: unknown[] = [];
  if (Array.isArray(parsed)) {
    entries = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "glosses" in parsed &&
    Array.isArray((parsed as { glosses: unknown[] }).glosses)
  ) {
    entries = (parsed as { glosses: unknown[] }).glosses;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "data" in parsed &&
    Array.isArray((parsed as { data: unknown[] }).data)
  ) {
    entries = (parsed as { data: unknown[] }).data;
  } else {
    throw new Error(
      "JSON structure unrecognized: expected an array of glosses or an object with 'glosses' or 'data' array."
    );
  }

  const results: NormalizedGlossRecord[] = [];

  for (let i = 0; i < entries.length; i++) {
    const item = entries[i] as RawGlossExportEntry;
    if (!item || typeof item !== "object") continue;

    const rawName = item.name ?? item.gloss ?? item.token ?? item.glossName;
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      console.warn(`[SKIP] Entry at index ${i} has no valid gloss/name.`);
      continue;
    }

    const gloss = rawName.normalize("NFC").trim().toUpperCase();

    // Sinhala forms / synonyms
    const rawSynonyms =
      item.sinhalaForms ??
      item.sinhala_forms ??
      item["Sinhala forms"] ??
      item.synonyms ??
      item.forms ??
      [];

    let synonyms: string[] = [];
    if (Array.isArray(rawSynonyms)) {
      synonyms = rawSynonyms
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.normalize("NFC").trim())
        .filter(Boolean);
    } else if (typeof rawSynonyms === "string") {
      synonyms = rawSynonyms
        .split(",")
        .map((s) => s.normalize("NFC").trim())
        .filter(Boolean);
    }

    // Public ID
    const rawPublicId = item.public_id ?? item.publicId ?? item.cloudinaryPublicId;
    const publicId = (rawPublicId && typeof rawPublicId === "string" && rawPublicId.trim())
      ? rawPublicId.trim()
      : `sign-glosses/${gloss.toLowerCase().replace(/\s+/g, "-")}`;

    // Animation URL
    const rawUrl = item.animationUrl ?? item.animation_url ?? item.cloudinaryUrl ?? item.url;
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      console.warn(`[SKIP] Gloss "${gloss}" missing animationUrl.`);
      continue;
    }

    const finalUrl = remapBase ? remapAnimationUrl(rawUrl.trim(), remapBase, publicId) : rawUrl.trim();

    const record: NormalizedGlossRecord = {
      gloss,
      synonyms,
      cloudinaryUrl: finalUrl,
      cloudinaryPublicId: publicId,
    };

    if (item.previewImage && typeof item.previewImage === "string") {
      record.previewImage = item.previewImage;
    }
    if (item.rig === "mixamo" || item.rig === "biped") {
      record.rig = item.rig;
    }
    if (item.sourceAvatar === "girl" || item.sourceAvatar === "boy") {
      record.sourceAvatar = item.sourceAvatar;
    }
    if (typeof item.duration === "number") {
      record.duration = item.duration;
    }
    if (typeof item.boneCount === "number") {
      record.boneCount = item.boneCount;
    }

    results.push(record);
  }

  return results;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  let filePath: string | null = null;
  let remapBase: string | null = null;
  let writeMode = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" || arg === "-f") {
      filePath = args[++i] ?? null;
    } else if (arg === "--remap-base") {
      remapBase = args[++i] ?? null;
    } else if (arg === "--write" || arg === "--apply") {
      writeMode = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { filePath, remapBase, writeMode };
}

function printHelp() {
  console.log(`
importGlosses.ts - Import gloss animations and Sinhala forms into Communicate

Usage:
  npx tsx scripts/importGlosses.ts --file <path> [options]

Options:
  --file, -f <path>     Path to the exported JSON file (required)
  --remap-base <url>    Remap animationUrl to point to a new Cloudinary base URL
  --write, --apply      Persist changes to MongoDB (defaults to dry-run)
  --help, -h            Show this help text

Dry-run:
  By default, no database operations are performed. The script will validate
  entries, preview the mappings and show remapped URLs without writing.
`);
}

async function main() {
  const { filePath, remapBase, writeMode } = parseCliArgs();

  if (!filePath) {
    console.error("Error: --file <path> is required.\n");
    printHelp();
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at "${resolvedPath}".`);
    process.exit(1);
  }

  console.log(`Reading gloss export from: ${resolvedPath}`);
  const content = fs.readFileSync(resolvedPath, "utf8");
  const records = parseExportedGlosses(content, remapBase ?? undefined);

  console.log(`Parsed ${records.length} valid gloss records.`);
  if (remapBase) {
    console.log(`URL remapping active with base: ${remapBase}`);
  }

  if (!writeMode) {
    console.log("\n========================================================");
    console.log("[DRY RUN] Previewing gloss records (no DB writes made):");
    console.log("========================================================");

    const previewLimit = Math.min(records.length, 10);
    for (let i = 0; i < previewLimit; i++) {
      const r = records[i];
      console.log(`[${i + 1}/${records.length}] Gloss: ${r.gloss}`);
      console.log(`  Synonyms (${r.synonyms.length}): [${r.synonyms.join(", ")}]`);
      console.log(`  Public ID: ${r.cloudinaryPublicId}`);
      console.log(`  Cloudinary URL: ${r.cloudinaryUrl}`);
      if (r.rig) console.log(`  Rig: ${r.rig}`);
      if (r.sourceAvatar) console.log(`  Source Avatar: ${r.sourceAvatar}`);
    }

    if (records.length > previewLimit) {
      console.log(`... and ${records.length - previewLimit} more records.`);
    }

    console.log("\n========================================================");
    console.log("Dry-run complete. To persist to MongoDB, re-run with --write or --apply.");
    console.log("========================================================\n");
    process.exit(0);
  }

  // Write mode
  console.log("\n[WRITE MODE] Connecting to MongoDB...");
  await connectDB();

  let upsertCount = 0;
  for (const r of records) {
    await GlossModel.findOneAndUpdate(
      { gloss: r.gloss },
      {
        gloss: r.gloss,
        synonyms: r.synonyms,
        cloudinaryUrl: r.cloudinaryUrl,
        cloudinaryPublicId: r.cloudinaryPublicId,
        ...(r.previewImage && { previewImage: r.previewImage }),
        ...(r.rig && { rig: r.rig }),
        ...(r.sourceAvatar && { sourceAvatar: r.sourceAvatar }),
        ...(r.duration !== undefined && { duration: r.duration }),
        ...(r.boneCount !== undefined && { boneCount: r.boneCount }),
      },
      { upsert: true, new: true }
    );
    upsertCount++;
    console.log(`[OK] Upserted "${r.gloss}" (${upsertCount}/${records.length})`);
  }

  console.log(`\nDone! Successfully imported ${upsertCount} glosses to MongoDB.`);
  process.exit(0);
}

// Run main if invoked directly
if (process.argv[1] && (process.argv[1].endsWith("importGlosses.ts") || process.argv[1].endsWith("importGlosses.js"))) {
  main().catch((err) => {
    console.error("Fatal error during import:", err);
    process.exit(1);
  });
}
