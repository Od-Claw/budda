import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

type CubemapFace = {
  file: "px.jpg" | "nx.jpg" | "py.jpg" | "ny.jpg" | "pz.jpg" | "nz.jpg";
  label: string;
  prompt: string;
};

const OUTPUT_DIR = join(process.cwd(), "public", "assets", "cubemap", "generated");
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
const IMAGE_SIZE = process.env.CUBEMAP_IMAGE_SIZE ?? "2048x2048";
const IMAGE_QUALITY = process.env.CUBEMAP_IMAGE_QUALITY ?? "high";
const OUTPUT_FORMAT = "jpeg";
const OUTPUT_COMPRESSION = Number(process.env.CUBEMAP_IMAGE_COMPRESSION ?? "95");
const MIN_IMAGE_SIZE = 2048;

const BASE_PROMPT = [
  "戶外古蹟佛堂，森林環繞，古老石牆，藤蔓，花草，暖金色陽光，神聖、電影感、酷感。",
  "中央有金色大佛，佛前有紅布金紋供桌，左右牆有多層小佛龕，小佛像前可以點燈。",
  "石牆細節、佛像雕刻、植物、花草都要清晰。無文字、無 UI、無水印、無人物。",
  "photorealistic, cinematic, sacred ancient buddhist temple ruins, ultra detailed stone texture, golden buddha, warm candle light, forest canopy, high dynamic range, sharp details, no text, no watermark, no people.",
  "The six images are intended as one cubemap from the same fixed camera position. Keep one coherent temple, one consistent warm sunlight direction, one consistent scale, matching stone texture, matching foliage, and matching sacred atmosphere."
].join("\n");

const FACES: CubemapFace[] = [
  {
    file: "nz.jpg",
    label: "front / -Z",
    prompt:
      "同一個戶外古蹟佛堂場景，正前方看向中央金色大佛。大佛完整清楚，左右小佛像清楚，佛前主供桌清楚，石牆雕刻清楚，暖金色陽光從樹冠灑下。這是 cubemap 的 front face，90 degree field of view，camera fixed at temple center looking forward."
  },
  {
    file: "px.jpg",
    label: "right / +X",
    prompt:
      "同一個場景，相機位置不變，向右轉 90 度。看到右側石牆、多層小佛龕、植物、燭光、石雕細節。不要出現另一尊巨大主佛。保持同樣光線與風格。cubemap right face, 90 degree FOV."
  },
  {
    file: "nx.jpg",
    label: "left / -X",
    prompt:
      "同一個場景，相機位置不變，向左轉 90 度。看到左側石牆、多層小佛龕、植物、燭光、石雕細節。不要出現另一尊巨大主佛。保持同樣光線與風格。cubemap left face, 90 degree FOV."
  },
  {
    file: "pz.jpg",
    label: "back / +Z",
    prompt:
      "同一個場景，相機位置不變，向後轉 180 度。看到背面古蹟石牆、入口、植物、散落花草、環境光，不要出現主大佛。cubemap back face, 90 degree FOV."
  },
  {
    file: "py.jpg",
    label: "up / +Y",
    prompt:
      "同一個場景，相機位置不變，向上看。看到樹冠、天光、葉子、陽光穿透、古蹟牆頂，不要有文字或 UI。cubemap top face, 90 degree FOV."
  },
  {
    file: "ny.jpg",
    label: "down / -Y",
    prompt:
      "同一個場景，相機位置不變，向下看。看到石板地面、落葉、花草、供桌前地面、古蹟庭院地面紋理。cubemap bottom face, 90 degree FOV."
  }
];

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) return null;
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

function buildPrompt(face: CubemapFace): string {
  return [
    BASE_PROMPT,
    "",
    `Current face: ${face.label}`,
    face.prompt,
    "",
    "Strict cubemap constraints: square image, 90 degree field of view, no fisheye lens, no labels, no captions, no signs, no duplicated giant Buddha except the front face, no people, no watermark, no UI."
  ].join("\n");
}

async function generateFace(apiKey: string, face: CubemapFace): Promise<void> {
  const outputPath = join(OUTPUT_DIR, face.file);
  const body = {
    model: MODEL,
    prompt: buildPrompt(face),
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY,
    n: 1,
    output_format: OUTPUT_FORMAT,
    output_compression: OUTPUT_COMPRESSION
  };

  console.info("[cubemap-generate] requesting", {
    face: face.file,
    model: MODEL,
    size: IMAGE_SIZE,
    quality: IMAGE_QUALITY
  });

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
    throw new Error(`OpenAI image generation failed for ${face.file}: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const image = json.data?.[0];
  if (!image) throw new Error(`OpenAI response did not include image data for ${face.file}`);

  let bytes: Buffer;
  if (image.b64_json) {
    bytes = Buffer.from(image.b64_json, "base64");
  } else if (image.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error(`Generated image URL failed for ${face.file}: ${imageResponse.status}`);
    }
    bytes = Buffer.from(await imageResponse.arrayBuffer());
  } else {
    throw new Error(`OpenAI response image has neither b64_json nor url for ${face.file}`);
  }

  await writeFile(outputPath, bytes);
  const fileStat = await stat(outputPath);
  if (fileStat.size <= 0) throw new Error(`Generated image is empty: ${outputPath}`);
  assertImageDimensions(bytes, outputPath);
  console.info("[cubemap-generate] wrote", { file: outputPath, bytes: fileStat.size });
}

async function main(): Promise<void> {
  const apiKey = assertApiKey();
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.info("[cubemap-generate] output", OUTPUT_DIR);
  console.info("[cubemap-generate] note", "Generated cubemap faces need manual review before copying to public/assets/cubemap/4k.");

  for (const face of FACES) {
    await generateFace(apiKey, face);
  }

  console.info("Generated cubemap assets are ready for validation. Run npm run validate:cubemap.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
