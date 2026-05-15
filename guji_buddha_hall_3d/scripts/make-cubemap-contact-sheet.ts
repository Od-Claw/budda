import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

type SheetSource = "raw" | "upscaled_4k";

const FACE_FILES = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"] as const;
const CANDIDATES_DIR = join(process.cwd(), "public", "assets", "cubemap", "candidates");
const REVIEW_DIR = join(process.cwd(), "public", "cubemap-review");
const TILE_SIZE = 512;
const LABEL_HEIGHT = 54;
const CELL_SIZE = TILE_SIZE + LABEL_HEIGHT;

function svgLabel(face: string): Buffer {
  return Buffer.from(`
    <svg width="${TILE_SIZE}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#15110a"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffd978">${face}</text>
    </svg>
  `);
}

async function makeTile(inputPath: string, face: string): Promise<Buffer> {
  const image = await sharp(inputPath)
    .resize(TILE_SIZE, TILE_SIZE, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 88 })
    .toBuffer();

  const label = await sharp(svgLabel(face)).png().toBuffer();

  return sharp({
    create: {
      width: TILE_SIZE,
      height: CELL_SIZE,
      channels: 3,
      background: "#15110a"
    }
  })
    .composite([
      { input: label, left: 0, top: 0 },
      { input: image, left: 0, top: LABEL_HEIGHT }
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function makeContactSheetForRun(
  runId: string,
  options: { prefer?: SheetSource } = {}
): Promise<string> {
  const source = options.prefer ?? "upscaled_4k";
  const runRoot = join(CANDIDATES_DIR, runId);
  const sourceDir = join(runRoot, source);
  const fallbackDir = join(runRoot, source === "raw" ? "upscaled_4k" : "raw");

  const readFace = async (file: string): Promise<string> => {
    const primary = join(sourceDir, file);
    try {
      await readFile(primary);
      return primary;
    } catch {
      return join(fallbackDir, file);
    }
  };

  const tiles = new Map<string, Buffer>();
  for (const file of FACE_FILES) {
    const face = file.replace(".jpg", "");
    tiles.set(face, await makeTile(await readFace(file), face));
  }

  const width = CELL_SIZE * 4;
  const height = CELL_SIZE * 3;
  const background = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#090704"
    }
  })
    .jpeg()
    .toBuffer();

  const positions: Record<string, { col: number; row: number }> = {
    py: { col: 1, row: 0 },
    nx: { col: 0, row: 1 },
    nz: { col: 1, row: 1 },
    px: { col: 2, row: 1 },
    pz: { col: 3, row: 1 },
    ny: { col: 1, row: 2 }
  };

  const composites = Object.entries(positions).map(([face, position]) => ({
    input: tiles.get(face)!,
    left: position.col * CELL_SIZE,
    top: position.row * CELL_SIZE
  }));

  const outputPath = join(runRoot, "contact-sheet.jpg");
  await sharp(background).composite(composites).jpeg({ quality: 92 }).toFile(outputPath);
  console.info("[cubemap-sheet] wrote", outputPath);
  return outputPath;
}

export async function updateReviewManifest(): Promise<void> {
  await mkdir(REVIEW_DIR, { recursive: true });
  const entries = [];

  try {
    const items = await readdir(CANDIDATES_DIR, { withFileTypes: true });
    for (const item of items) {
      if (!item.isDirectory()) continue;
      const runId = item.name;
      const manifestPath = join(CANDIDATES_DIR, runId, "manifest.json");
      try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { createdAt?: string; model?: string; size?: string; quality?: string };
        entries.push({
          runId,
          createdAt: manifest.createdAt ?? "",
          model: manifest.model ?? "",
          size: manifest.size ?? "",
          quality: manifest.quality ?? "",
          contactSheet: `../assets/cubemap/candidates/${runId}/contact-sheet.jpg`,
          testUrl: `../?env=cubemap&cubeSource=candidate&cubeSet=${encodeURIComponent(runId)}&cubeDebug=1`
        });
      } catch {
        // Skip incomplete candidate folders.
      }
    }
  } catch {
    // No candidates yet.
  }

  entries.sort((a, b) => b.runId.localeCompare(a.runId));
  await writeFile(join(REVIEW_DIR, "manifest.json"), `${JSON.stringify({ candidates: entries }, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const runId = process.argv[2] ?? process.env.CUBEMAP_RUN_ID;
  if (!runId) {
    console.error("Usage: npm run make:cubemap-sheet -- <runId>");
    process.exit(1);
  }

  await makeContactSheetForRun(runId);
  await updateReviewManifest();
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/make-cubemap-contact-sheet.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
