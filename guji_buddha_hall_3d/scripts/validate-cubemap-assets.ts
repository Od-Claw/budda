import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

type ImageInfo = {
  width: number;
  height: number;
  format: "jpeg" | "png";
};

const GENERATED_DIR = join(process.cwd(), "public", "assets", "cubemap", "generated");
const FACE_FILES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"] as const;
const MIN_SIZE = 2048;

function readPngDimensions(buffer: Buffer): ImageInfo | null {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) return null;
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

async function inspectImage(file: string): Promise<{ file: string; bytes: number; width: number; height: number; format: string; square: boolean; ok: boolean }> {
  const filePath = join(GENERATED_DIR, file);
  await access(filePath);
  const fileStat = await stat(filePath);
  const buffer = await readFile(filePath);
  const imageInfo = readJpegDimensions(buffer) ?? readPngDimensions(buffer);

  if (!imageInfo) {
    throw new Error(`Unsupported or unreadable image format: ${filePath}`);
  }

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

async function main(): Promise<void> {
  const results = [];
  let allOk = true;

  for (const file of FACE_FILES) {
    try {
      const result = await inspectImage(file);
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

  if (!allOk) {
    console.error(`Generated cubemap validation failed. Every face must be square and at least ${MIN_SIZE}x${MIN_SIZE}.`);
    process.exit(1);
  }

  console.info("Generated cubemap assets are ready for manual review.");
  console.info("Do not automatically copy generated assets into public/assets/cubemap/4k until the six faces are visually consistent.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
