/**
 * generate_texture_variants.mjs
 *
 * Phase 3 — Multi-resolution LOD downsampling script.
 *
 * Scans src/assets/textures/** for *_4k.png source files
 * and generates _512, _1k, and _2k variants alongside them.
 *
 * Rules:
 *   - ONLY the albedo (diff) map is downsampled — ARM/normal/disp stay at native
 *     resolution (they contain fine PBR detail that degrades badly at 512px)
 *   - Content-hash caching: output files are SKIPPED if they already exist
 *     and the source file hasn't changed (checked via mtime comparison)
 *   - Run automatically via `predev` / `prebuild` npm hooks
 *
 * Usage:
 *   node scripts/generate_texture_variants.mjs
 */

import sharp from "sharp";
import { readdir, stat, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEXTURES_ROOT = join(__dirname, "..", "src", "assets", "textures");

/** Resolutions to generate (in pixels — these are square textures) */
const VARIANTS = [
  { suffix: "_512", size: 512 },
  { suffix: "_1k",  size: 1024 },
  { suffix: "_2k",  size: 2048 },
];

/**
 * Which map types to downsample.
 * Includes diffuse, ARM (AO/Roughness/Metalness), normal, displacement, and specular.
 */
const DOWNSAMPLE_TYPES = ["diff", "arm", "nor", "nor_gl", "disp", "spec"];

let generated = 0;
let skipped = 0;
let errors = 0;

async function getSourceMtime(sourcePath) {
  try {
    const s = await stat(sourcePath);
    return s.mtimeMs;
  } catch {
    return 0;
  }
}

async function shouldSkip(sourcePath, outputPath) {
  if (!existsSync(outputPath)) return false;
  const srcMtime = await getSourceMtime(sourcePath);
  const outMtime = await getSourceMtime(outputPath);
  // Skip if output is newer than source
  return outMtime >= srcMtime;
}

async function processFile(sourcePath) {
  const file = basename(sourcePath, extname(sourcePath)); // e.g. "beige_wall_001_diff_4k"
  const dir = dirname(sourcePath);

  // Only process 4K source maps
  if (!file.endsWith("_4k")) return;

  // Determine map type (diff, arm, nor_gl, disp)
  const typeMatch = file.match(/_([a-z_]+)_4k$/);
  if (!typeMatch) return;
  const mapType = typeMatch[1]; // e.g. "diff", "arm", "nor_gl", "disp"

  // Skip non-albedo maps
  if (!DOWNSAMPLE_TYPES.includes(mapType)) return;

  const baseName = file.replace(`_${mapType}_4k`, ""); // e.g. "beige_wall_001"

  for (const { suffix, size } of VARIANTS) {
    const outputName = `${baseName}_${mapType}${suffix}.png`;
    const outputPath = join(dir, outputName);

    if (await shouldSkip(sourcePath, outputPath)) {
      skipped++;
      continue;
    }

    try {
      await sharp(sourcePath)
        .resize(size, size, { kernel: sharp.kernel.lanczos3, fit: "fill" })
        .png({ compressionLevel: 9, effort: 10 })
        .toFile(outputPath);
      generated++;
      console.log(`  ✅ ${outputName} (${size}px)`);
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed: ${outputName} — ${err.message}`);
    }
  }
}

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      await processFile(fullPath);
    }
  }
}

console.log("🖼️  [TextureVariants] Scanning texture sources...");
console.log(`📁 Root: ${TEXTURES_ROOT}`);

await walkDir(TEXTURES_ROOT);

console.log(`\n✅ Done — ${generated} variants generated, ${skipped} skipped (up-to-date), ${errors} errors.`);
if (errors > 0) process.exit(1);
