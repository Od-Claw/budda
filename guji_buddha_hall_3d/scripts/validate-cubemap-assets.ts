import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

type ImageInfo = {
  width: number;
  height: number;
  format: "jpeg" | "png";
};

type ValidateDir = "generated" | "generated_4k" | "raw" | "upscaled_4k";

const FACE_FILES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"] as const;
const CANDIDATES_DIR = join(process.cwd(), "public", "assets", "cubemap", "candidates");
const LEGACY_DIR = join(process.cwd(), "public", "assets", "cubemap");
const validateDir = getValidateDir();
const runId = process.env.CUBEMAP_RUN_ID ?? process.argv[2];
const MIN_SIZE = validateDir === "generated_4k" || validateDir === "upscaled_4k" ? 4096 : 2048;

function getValidateDir(): ValidateDir {
  const value = process.env.CUBEMAP_VALIDATE_DIR;
  if (value === "generated" || value === "generated_4k" || value === "raw" || value === "upscaled_4k") return value;
  return process.env.CUBEMAP_RUN_ID || process.argv[2] ? "upscaled_4k" : "generated";
}

function readPngDimensions(buffer: Buffer): ImageInfo | null {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    format: "png"
  };
}

function readJpegDimensions(buffer: Buffer): ImageInfo | null {
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
        width: buffer.readUInt16BE(offset + 5),
        format: "jpeg"
      };
    }

    offset += segmentLength;
  }

  return null;
}

async function getCandidateRunIds(): Promise<string[]> {
  if (runId) return [runId];
  const entries = await readdir(CANDIDATES_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function getFaceDir(currentRunId?: string): string {
  if (validateDir === "generated" || validateDir === "generated_4k") {
    return join(LEGACY_DIR, validateDir);
  }
  if (!currentRunId) throw new Error("CUBEMAP_RUN_ID or run id argument is required for raw/upscaled_4k validation.");
  return join(CANDIDATES_DIR, currentRunId, validateDir);
}

async function inspectImage(baseDir: string, file: string): Promise<{ file: string; bytes: number; width: number; height: number; format: string; square: boolean; ok: boolean }> {
  const filePath = join(baseDir, file);
  await access(filePath);
  const fileStat = await stat(filePath);
  const buffer = await readFile(filePath);
  const imageInfo = readJpegDimensions(buffer) ?? readPngDimensions(buffer);

  if (!imageInfo) throw new Error(`Unsupported or unreadable image format: ${filePath}`);

  const square = imageInfo.width === imageInfo.height;
  const ok = fileStat.size > 0 && square && imageInfo.width >= MIN_SIZE && imageInfo.height >= MIN_SIZE;

  return {
    file,
    bytes: fileStat.size,
    width: imageInfo.width,
    height: imageInfo.height,
    format: imageInfo.format,
    square,
    ok
  };
}

async function validateOne(currentRunId?: string): Promise<boolean> {
  const baseDir = getFaceDir(currentRunId);
  const results = [];
  let allOk = true;

  console.info("[cubemap-validate] directory", {
    runId: currentRunId ?? null,
    dir: validateDir,
    path: baseDir,
    expectedMinimum: `${MIN_SIZE}x${MIN_SIZE}`
  });

  for (const file of FACE_FILES) {
    try {
      const result = await inspectImage(baseDir, file);
      results.push(result);
      if (!result.ok) allOk = false;
    } catch (error) {
      allOk = false;
      results.push({
        file,
        bytes: 0,
        width: 0,
        height: 0,
        format: "missing",
        square: false,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.table(results);
  return allOk;
}

async function main(): Promise<void> {
  let allOk = true;

  if (validateDir === "generated" || validateDir === "generated_4k") {
    allOk = await validateOne();
  } else {
    const runIds = await getCandidateRunIds();
    if (runIds.length === 0) {
      console.error("No cubemap candidates found.");
      process.exit(1);
    }

    for (const currentRunId of runIds) {
      const ok = await validateOne(currentRunId);
      if (!ok) allOk = false;
    }
  }

  if (!allOk) {
    console.error(`Generated cubemap validation failed. Every face must be square and at least ${MIN_SIZE}x${MIN_SIZE}.`);
    process.exit(1);
  }

  console.info("Generated cubemap assets are ready for manual review.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
