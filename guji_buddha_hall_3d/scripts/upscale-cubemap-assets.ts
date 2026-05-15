import { access, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { makeContactSheetForRun, updateReviewManifest } from "./make-cubemap-contact-sheet";

const CANDIDATES_DIR = join(process.cwd(), "public", "assets", "cubemap", "candidates");
const FACE_FILES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"] as const;
const OUTPUT_SIZE = 4096;

async function getRunIds(): Promise<string[]> {
  const requested = process.argv[2] ?? process.env.CUBEMAP_RUN_ID;
  if (requested) return [requested];

  const entries = await readdir(CANDIDATES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function upscaleFace(runId: string, file: string): Promise<void> {
  const inputPath = join(CANDIDATES_DIR, runId, "raw", file);
  const outputPath = join(CANDIDATES_DIR, runId, "upscaled_4k", file);

  await access(inputPath);
  const inputStat = await stat(inputPath);
  if (inputStat.size <= 0) throw new Error(`Input cubemap face is empty: ${inputPath}`);

  await sharp(inputPath)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3
    })
    .jpeg({
      quality: 95,
      mozjpeg: true
    })
    .toFile(outputPath);

  const outputStat = await stat(outputPath);
  if (outputStat.size <= 0) throw new Error(`Upscaled cubemap face is empty: ${outputPath}`);

  const metadata = await sharp(outputPath).metadata();
  if (metadata.width !== OUTPUT_SIZE || metadata.height !== OUTPUT_SIZE) {
    throw new Error(`Upscaled cubemap face has wrong size: ${runId}/${file} is ${metadata.width}x${metadata.height}`);
  }

  console.info("[cubemap-upscale] wrote", {
    runId,
    file: outputPath,
    bytes: outputStat.size,
    width: metadata.width,
    height: metadata.height
  });
}

async function upscaleRun(runId: string): Promise<void> {
  await mkdir(join(CANDIDATES_DIR, runId, "upscaled_4k"), { recursive: true });

  for (const file of FACE_FILES) {
    await upscaleFace(runId, file);
  }

  await makeContactSheetForRun(runId, { prefer: "upscaled_4k" });
}

async function main(): Promise<void> {
  const runIds = await getRunIds();
  if (runIds.length === 0) {
    console.error("No cubemap candidates found. Run npm run generate:cubemap first.");
    process.exit(1);
  }

  for (const runId of runIds) {
    await upscaleRun(runId);
  }

  await updateReviewManifest();
  console.info("Upscaled cubemap candidates are ready for manual review.");
  console.info("Do not automatically copy upscaled_4k assets into public/assets/cubemap/4k.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
