import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { makeContactSheetForRun, updateReviewManifest } from "./make-cubemap-contact-sheet";

type FaceName = "px" | "nx" | "py" | "ny" | "pz" | "nz";

type FacePrompt = {
  file: `${FaceName}.jpg`;
  label: string;
  prompt: string;
};

const FACE_NAMES: FaceName[] = ["px", "nx", "py", "ny", "pz", "nz"];
const CANDIDATES_DIR = join(process.cwd(), "public", "assets", "cubemap", "candidates");
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
const IMAGE_SIZE = process.env.CUBEMAP_IMAGE_SIZE ?? "2880x2880";
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? process.env.CUBEMAP_IMAGE_QUALITY ?? "high";
const OUTPUT_FORMAT = "jpeg";
const OUTPUT_COMPRESSION = Number(process.env.CUBEMAP_IMAGE_COMPRESSION ?? "95");
const MIN_IMAGE_SIZE = 2048;

const BASE_PROMPT = [
  "A single coherent outdoor ancient Buddhist temple ruin, surrounded by forest, mossy old stone walls, vines, flowers, warm golden sunlight, sacred cinematic atmosphere, slightly cool epic mood.",
  "The scene has a central golden Buddha at the front, a red cloth altar table with gold patterns, layered small Buddha niches on the left and right stone walls, and small lamp positions in front of those niches.",
  "All six cubemap faces must feel like the same place from the same fixed camera point: same stone texture, same plants, same warm light direction, same scale, same sacred mood.",
  "Photorealistic cinematic ancient Buddhist temple ruins, ultra detailed stone carvings, sacred atmosphere, golden Buddha, warm candlelight, mossy stone walls, vines, flowers, forest canopy, high dynamic range, sharp details.",
  "Avoid: text, watermark, UI, people, modern objects, duplicate giant Buddha on side faces, different temple, different lighting, cartoon style, low resolution, blurry, distorted statues, extra faces, random symbols."
].join("\n");

const FACE_PROMPTS: Record<FaceName, FacePrompt> = {
  nz: {
    file: "nz.jpg",
    label: "front / -Z",
    prompt:
      "same exact outdoor ancient Buddhist temple scene, camera fixed at temple center, looking forward, 90 degree cubemap face. The central golden Buddha is directly ahead, complete and sharp. Left and right small Buddha statues are visible. The red cloth gold-pattern main altar table is visible. Wall niches and stone carving details are clear. No text, no people."
  },
  px: {
    file: "px.jpg",
    label: "right / +X",
    prompt:
      "same exact temple scene, same camera position, rotated 90 degrees to the right, 90 degree cubemap face. Right ancient stone wall, layered small Buddha niches, lamp positions, vines, plants, and stone carving detail. Do not show another giant main Buddha. Match the front face lighting, material, color temperature, and scale."
  },
  nx: {
    file: "nx.jpg",
    label: "left / -X",
    prompt:
      "same exact temple scene, same camera position, rotated 90 degrees to the left, 90 degree cubemap face. Left ancient stone wall, layered small Buddha niches, lamp positions, vines, plants, and stone carving detail. Do not show another giant main Buddha. Match the front face lighting, material, color temperature, and scale."
  },
  pz: {
    file: "pz.jpg",
    label: "back / +Z",
    prompt:
      "same exact temple scene, same camera position, turned 180 degrees backward, 90 degree cubemap face. Rear ancient stone wall, entrance, stone floor, plants, scattered flowers, warm environment light. Do not show the central main Buddha. Keep the same materials and light source."
  },
  py: {
    file: "py.jpg",
    label: "up / +Y",
    prompt:
      "same exact temple scene, same camera position, looking upward, 90 degree cubemap face. Forest canopy, sky glow, leaves, sunlight passing through branches, ancient ruin wall tops. No text, no people, no UI."
  },
  ny: {
    file: "ny.jpg",
    label: "down / -Y",
    prompt:
      "same exact temple scene, same camera position, looking downward, 90 degree cubemap face. Stone floor, fallen leaves, flowers, plants, ground in front of the altar table, detailed ancient courtyard floor texture. No text, no UI."
  }
};

function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function getRunIds(): string[] {
  const variantCount = Math.max(1, Math.floor(Number(process.env.CUBEMAP_VARIANTS ?? "1") || 1));
  const baseRunId = process.env.CUBEMAP_RUN_ID || `run-${timestamp()}`;

  if (variantCount === 1) return [baseRunId];
  return Array.from({ length: variantCount }, (_, index) => `${baseRunId}-v${index + 1}`);
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }

    offset += segmentLength;
  }

  return null;
}

function assertImageDimensions(buffer: Buffer, file: string): void {
  const dimensions = readJpegDimensions(buffer) ?? readPngDimensions(buffer);
  if (!dimensions) throw new Error(`Cannot read generated image dimensions: ${file}`);
  if (dimensions.width !== dimensions.height) {
    throw new Error(`Generated image must be square: ${file} is ${dimensions.width}x${dimensions.height}`);
  }
  if (dimensions.width < MIN_IMAGE_SIZE || dimensions.height < MIN_IMAGE_SIZE) {
    throw new Error(`Generated image is too small: ${file} is ${dimensions.width}x${dimensions.height}, expected at least ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE}`);
  }
}

function assertApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY. Cannot generate images.");
    process.exit(1);
  }
  return apiKey;
}

function buildPrompt(face: FacePrompt, referenceAvailable: boolean): string {
  const referenceNote = referenceAvailable
    ? "Use the provided front face reference to preserve the exact same temple, lighting, material, scale, and camera origin."
    : "Reference image mode unavailable, using text-only prompt. Keep this face consistent with the described front face.";

  return [
    BASE_PROMPT,
    "",
    `Current face: ${face.label}`,
    face.prompt,
    referenceNote,
    "",
    "Strict cubemap constraints: square image, 90 degree field of view, no fisheye lens, no labels, no captions, no signs, no people, no watermark, no UI."
  ].join("\n");
}

async function requestImage(apiKey: string, prompt: string): Promise<Buffer> {
  const body = {
    model: MODEL,
    prompt,
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY,
    n: 1,
    output_format: OUTPUT_FORMAT,
    output_compression: OUTPUT_COMPRESSION
  };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const image = json.data?.[0];
  if (!image) throw new Error("OpenAI response did not include image data.");

  if (image.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) throw new Error(`Generated image URL failed: ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI response image has neither b64_json nor url.");
}

async function generateFace(apiKey: string, runRoot: string, face: FacePrompt, referenceAvailable: boolean): Promise<void> {
  const outputPath = join(runRoot, "raw", face.file);
  console.info("[cubemap-generate] requesting", {
    face: face.file,
    model: MODEL,
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY
  });

  const bytes = await requestImage(apiKey, buildPrompt(face, referenceAvailable));
  await writeFile(outputPath, bytes);

  const fileStat = await stat(outputPath);
  if (fileStat.size <= 0) throw new Error(`Generated image is empty: ${outputPath}`);
  assertImageDimensions(bytes, outputPath);
  console.info("[cubemap-generate] wrote", { file: outputPath, bytes: fileStat.size });
}

async function writeManifest(runId: string, runRoot: string): Promise<void> {
  const prompts = Object.fromEntries(FACE_NAMES.map((faceName) => [faceName, buildPrompt(FACE_PROMPTS[faceName], false)]));
  const manifest = {
    runId,
    createdAt: new Date().toISOString(),
    model: MODEL,
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY,
    faces: FACE_NAMES,
    prompts,
    notes: "manual review required"
  };
  await writeFile(join(runRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function generateRun(apiKey: string, runId: string): Promise<void> {
  const runRoot = join(CANDIDATES_DIR, runId);
  await mkdir(join(runRoot, "raw"), { recursive: true });
  await mkdir(join(runRoot, "upscaled_4k"), { recursive: true });

  console.info("[cubemap-generate] run", runId);
  console.info("Reference image mode unavailable, using text-only prompt.");

  await generateFace(apiKey, runRoot, FACE_PROMPTS.nz, false);
  for (const faceName of FACE_NAMES.filter((faceName) => faceName !== "nz")) {
    await generateFace(apiKey, runRoot, FACE_PROMPTS[faceName], false);
  }

  await writeManifest(runId, runRoot);
  await makeContactSheetForRun(runId, { prefer: "raw" });
  await updateReviewManifest();
}

async function main(): Promise<void> {
  const apiKey = assertApiKey();
  const runIds = getRunIds();
  await mkdir(CANDIDATES_DIR, { recursive: true });

  console.info("[cubemap-generate] candidates", CANDIDATES_DIR);
  console.info("[cubemap-generate] note", "Candidate faces need manual review before promotion to public/assets/cubemap/4k.");

  for (const runId of runIds) {
    await generateRun(apiKey, runId);
  }

  console.info("Generated cubemap candidates are ready for review.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
