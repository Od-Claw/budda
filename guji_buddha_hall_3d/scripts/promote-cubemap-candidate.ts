import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const FACE_FILES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"] as const;
const CANDIDATES_DIR = join(process.cwd(), "public", "assets", "cubemap", "candidates");
const OFFICIAL_DIR = join(process.cwd(), "public", "assets", "cubemap", "4k");
const BACKUPS_DIR = join(process.cwd(), "public", "assets", "cubemap", "backups");
const REQUIRED_SIZE = 4096;

function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    "backup-",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

async function getJpegSize(path: string): Promise<{ width: number; height: number }> {
  const buffer = await import("node:fs/promises").then((fs) => fs.readFile(path));
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error(`Not a JPEG: ${path}`);

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = buffer.readUInt16BE(offset);
    const sof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (sof) return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    offset += length;
  }
  throw new Error(`Cannot read JPEG size: ${path}`);
}

async function validateCandidate(runId: string): Promise<string> {
  const sourceDir = join(CANDIDATES_DIR, runId, "upscaled_4k");
  await stat(sourceDir);

  for (const file of FACE_FILES) {
    const filePath = join(sourceDir, file);
    const fileStat = await stat(filePath);
    if (fileStat.size <= 0) throw new Error(`Candidate face is empty: ${filePath}`);
    const size = await getJpegSize(filePath);
    if (size.width !== REQUIRED_SIZE || size.height !== REQUIRED_SIZE) {
      throw new Error(`Candidate face must be ${REQUIRED_SIZE}x${REQUIRED_SIZE}: ${filePath} is ${size.width}x${size.height}`);
    }
  }

  return sourceDir;
}

async function backupOfficial(): Promise<string> {
  const backupDir = join(BACKUPS_DIR, timestamp());
  await mkdir(backupDir, { recursive: true });

  try {
    await stat(OFFICIAL_DIR);
    const entries = await readdir(OFFICIAL_DIR);
    for (const entry of entries) {
      if (!FACE_FILES.includes(entry as (typeof FACE_FILES)[number])) continue;
      await copyFile(join(OFFICIAL_DIR, entry), join(backupDir, entry));
    }
  } catch {
    // Official cubemap may not exist yet.
  }

  return backupDir;
}

async function main(): Promise<void> {
  const runId = process.argv[2];
  if (!runId) {
    console.error("Usage: npm run promote:cubemap -- <runId>");
    process.exit(1);
  }

  const sourceDir = await validateCandidate(runId);
  const backupDir = await backupOfficial();
  await mkdir(OFFICIAL_DIR, { recursive: true });

  for (const file of FACE_FILES) {
    await copyFile(join(sourceDir, file), join(OFFICIAL_DIR, file));
  }

  console.info("[cubemap-promote] promoted", {
    runId,
    sourceDir,
    officialDir: OFFICIAL_DIR,
    backupDir
  });
  console.info("Review the result, then git add/commit the promoted cubemap assets manually.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
