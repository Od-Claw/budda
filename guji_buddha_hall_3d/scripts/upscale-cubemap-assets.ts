import { access, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const INPUT_DIR = join(process.cwd(), "public", "assets", "cubemap", "generated");
const OUTPUT_DIR = join(process.cwd(), "public", "assets", "cubemap", "generated_4k");
const FACE_FILES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"] as const;
const OUTPUT_SIZE = 4096;

async function upscaleFace(file: string): Promise<void> {
  const inputPath = join(INPUT_DIR, file);
  const outputPath = join(OUTPUT_DIR, file);

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
    throw new Error(`Upscaled cubemap face has wrong size: ${file} is ${metadata.width}x${metadata.height}`);
  }

  console.info("[cubemap-upscale] wrote", {
    file: outputPath,
    bytes: outputStat.size,
    width: metadata.width,
    height: metadata.height
  });
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const file of FACE_FILES) {
    await upscaleFace(file);
  }

  console.info("Upscaled cubemap assets are ready for manual review.");
  console.info("Do not automatically copy generated_4k assets into public/assets/cubemap/4k.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
