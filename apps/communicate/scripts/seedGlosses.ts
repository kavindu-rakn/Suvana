/**
 * Seeds MongoDB/Cloudinary with the exact 35 gloss tokens the notebook's
 * SINHALA_TO_GLOSS dictionary can produce (lib/ipynb/WhishperBackend.ipynb,
 * cell-2), so the "notebook glosses -> Mongo -> Cloudinary URL" lookup in
 * app/api/gloss/predict has something to match against.
 *
 * The animation JSON below is a placeholder (same tiny keyframe for every
 * gloss) purely to exercise the pipeline end to end. Replace each entry's
 * animation via POST /api/animations or /api/animations/upload once you
 * have real per-gloss exports — see lib/animation/mixamoJsonToClip.ts for
 * the accepted JSON shapes.
 *
 * Usage:  npx tsx scripts/seedGlosses.ts --placeholder-dev-only
 *
 * NOTE: The script refuses to run without --placeholder-dev-only to prevent
 * accidental demoing of placeholder animations.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectDB } from "../lib/db";
import GlossModel from "../models/Gloss";
import { uploadGlossJson } from "../lib/cloudinary";

function placeholderAnimation(name: string) {
  return {
    name,
    duration: 1,
    bones: [
      {
        name: "mixamorigRightForeArm",
        times: [0, 0.5, 1],
        quaternions: [
          [0, 0, 0, 1],
          [0, 0.38, 0, 0.92],
          [0, 0, 0, 1],
        ],
      },
    ],
  };
}

// Every unique value from SINHALA_TO_GLOSS in the notebook. Kept in the same
// underscore style (e.g. "THANK_YOU") the notebook emits, since
// app/api/gloss/predict matches these case-insensitively but exactly.
const GLOSS_TOKENS = [
  "ME", "YOU", "HE", "SHE", "WE",
  "GO", "COME", "EAT", "DRINK", "DO", "SEE", "KNOW", "LOVE", "MAKE",
  "HOME", "SCHOOL", "WATER", "FOOD", "MOTHER", "FATHER",
  "HELLO", "THANK_YOU", "SORRY", "YES", "NO", "GOOD", "BAD",
  "TODAY", "TOMORROW", "YESTERDAY", "YOUR", "NAME", "WHAT", "CAN", "WHERE",
] as const;

// Optional English synonyms, only used by the manual/fallback text matcher
// (dictionaryMatcher.ts) when someone types English text directly instead
// of going through the notebook. Not needed for the primary flow.
const FALLBACK_SYNONYMS: Partial<Record<(typeof GLOSS_TOKENS)[number], string[]>> = {
  HELLO: ["hi", "hey", "greetings"],
  THANK_YOU: ["thanks", "thank you", "appreciate it"],
  YES: ["yeah", "yep", "correct"],
  NO: ["nope", "not"],
  SORRY: ["apologies", "my bad"],
};

async function main() {
  if (!process.argv.includes("--placeholder-dev-only")) {
    console.error(
      "\n====================================================================\n" +
      "REFUSING TO SEED: --placeholder-dev-only flag required\n" +
      "====================================================================\n" +
      "seedGlosses.ts generates placeholder animation data (identical keyframes\n" +
      "for every gloss) purely to exercise the pipeline end-to-end.\n\n" +
      "Hard rules: Placeholder animations must NEVER be used in demos or\n" +
      "production. Use importGlosses.ts to import genuine SSL animations instead.\n\n" +
      "If you are developing locally and explicitly want placeholder fixtures,\n" +
      "re-run with:\n" +
      "  npx tsx scripts/seedGlosses.ts --placeholder-dev-only\n" +
      "====================================================================\n"
    );
    process.exit(1);
  }

  console.warn(
    "\n[WARNING] Seeding placeholder animations via --placeholder-dev-only.\n" +
    "These placeholder animations are for local pipeline tests only and must NEVER be used in demos or production.\n"
  );

  await connectDB();

  for (const gloss of GLOSS_TOKENS) {
    const upload = await uploadGlossJson(
      placeholderAnimation(gloss),
      gloss.toLowerCase().replace(/_/g, "-")
    );

    await GlossModel.findOneAndUpdate(
      { gloss },
      {
        gloss,
        synonyms: FALLBACK_SYNONYMS[gloss] ?? [],
        cloudinaryUrl: upload.secure_url,
        cloudinaryPublicId: upload.public_id,
      },
      { upsert: true, new: true }
    );

    console.log(`Seeded gloss "${gloss}" -> ${upload.secure_url}`);
  }

  console.log(`Done. Seeded ${GLOSS_TOKENS.length} glosses.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
