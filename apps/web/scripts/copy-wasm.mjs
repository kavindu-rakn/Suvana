// Copies MediaPipe's WASM runtime out of node_modules into public/wasm so it
// is served from our own origin (no CDN dependency during demos). Runs on
// `npm install` via the postinstall hook; public/wasm is gitignored.
//
// We copy an explicit allowlist rather than the whole directory. The upstream
// wasm/ folder ships three runtime variants at ~11 MB each; this app can only
// ever load two of them, so copying all three put ~11.5 MB of dead weight into
// every deployment.
//
// Which variant loads is decided by FilesetResolver.forVisionTasks(dir, module):
//   module === true   -> vision_wasm_module_internal
//   module === false  -> vision_wasm_internal        (WASM SIMD available)
//                     -> vision_wasm_nosimd_internal (no SIMD; older browsers)
// `module` defaults to false and src/vision/handTracker.ts passes only the
// directory, so the _module_ variant is unreachable and is not copied.
//
// The nosimd variant IS copied and must stay: WASM SIMD needs Safari 16.4+
// (March 2023), and pilot participants use their own devices. Dropping it
// would make the camera fail outright on an older iPhone rather than run slower.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const dest = join(here, '..', 'public', 'wasm')

const VARIANTS = ['vision_wasm_internal', 'vision_wasm_nosimd_internal']
const FILES = VARIANTS.flatMap((v) => [`${v}.js`, `${v}.wasm`])

mkdirSync(dest, { recursive: true })

// Fail at install time rather than shipping a deployment that 404s at runtime:
// if a tasks-vision upgrade renames these files, the app would otherwise only
// break when someone starts the camera.
const missing = FILES.filter((f) => !existsSync(join(src, f)))
if (missing.length > 0) {
  console.error(
    `copy-wasm: expected MediaPipe runtime files are missing from ${src}:\n` +
      missing.map((f) => `  - ${f}`).join('\n') +
      '\n@mediapipe/tasks-vision may have renamed its runtime variants. Check the\n' +
      'wasm/ directory in the package and update VARIANTS in this script.',
  )
  process.exit(1)
}

for (const f of FILES) copyFileSync(join(src, f), join(dest, f))
console.log(`Copied ${FILES.length} MediaPipe WASM runtime files -> ${dest}`)
