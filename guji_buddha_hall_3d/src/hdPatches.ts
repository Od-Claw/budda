import * as THREE from "three";
import { getPanoramaDebugInfo } from "./panorama";

type HdPatchConfig = {
  id: string;
  url: string;
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  radius: number;
  segmentsX: number;
  segmentsY: number;
  featherPx: number;
  rotationY: number;
  yawOffsetDeg: number;
  enabled: boolean;
};

export type HdPatchesOptions = {
  debug?: boolean;
  textureDebug?: boolean;
};

type HdPatchStatus = {
  id: string;
  url: string;
  status: "loaded" | "skipped";
  imageWidth?: number;
  imageHeight?: number;
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  error?: string;
};

type TextureDebugOptions = {
  enabled: boolean;
  debug: boolean;
  opacity?: number;
  globalHdYaw?: number;
  statuses?: HdPatchStatus[];
};

const BASE = import.meta.env.BASE_URL;

const HD_PATCHES: HdPatchConfig[] = [
  { id: "front", url: `${BASE}assets/patches/guji_patch_front_8192x4096.jpg`, lonMin: -58, lonMax: 58, latMin: -40, latMax: 44, radius: 496, segmentsX: 220, segmentsY: 140, featherPx: 260, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "left-wall", url: `${BASE}assets/patches/guji_patch_left_4096x4096.jpg`, lonMin: -150, lonMax: -62, latMin: -34, latMax: 45, radius: 496, segmentsX: 160, segmentsY: 120, featherPx: 220, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "right-wall", url: `${BASE}assets/patches/guji_patch_right_4096x4096.jpg`, lonMin: 62, lonMax: 150, latMin: -34, latMax: 45, radius: 496, segmentsX: 160, segmentsY: 120, featherPx: 220, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "back", url: `${BASE}assets/patches/guji_patch_back_4096x4096.jpg`, lonMin: 150, lonMax: 210, latMin: -35, latMax: 35, radius: 496, segmentsX: 120, segmentsY: 90, featherPx: 200, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "ceiling", url: `${BASE}assets/patches/guji_patch_ceiling_4096x2048.jpg`, lonMin: -180, lonMax: 180, latMin: 35, latMax: 82, radius: 495, segmentsX: 240, segmentsY: 80, featherPx: 180, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "floor", url: `${BASE}assets/patches/guji_patch_floor_4096x2048.jpg`, lonMin: -180, lonMax: 180, latMin: -82, latMax: -28, radius: 495, segmentsX: 240, segmentsY: 80, featherPx: 180, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true }
];

function readNumberParam(key: string, fallback: number): number {
  const value = Number(new URLSearchParams(window.location.search).get(key));
  return Number.isFinite(value) ? value : fallback;
}

function getGlobalHdYaw(): number {
  return readNumberParam("hdYaw", 0);
}

function getHdPatchOpacity(debug: boolean): number {
  const value = Number(new URLSearchParams(window.location.search).get("hdPatchOpacity"));
  if (!Number.isFinite(value)) return debug ? 0.75 : 1;
  return THREE.MathUtils.clamp(value, 0.05, 1);
}

function shouldShowTextureDebug(options?: HdPatchesOptions): boolean {
  return options?.textureDebug ?? new URLSearchParams(window.location.search).get("textureDebug") === "1";
}

function sphericalPosition(lonDeg: number, latDeg: number, radius: number): THREE.Vector3 {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    radius * Math.sin(lon) * Math.cos(lat),
    radius * Math.sin(lat),
    -radius * Math.cos(lon) * Math.cos(lat)
  );
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return img;
}

function createFeatheredTexture(img: HTMLImageElement, renderer: THREE.WebGLRenderer, featherPx: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create canvas context for HD patch");

  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      let t = THREE.MathUtils.clamp(edge / featherPx, 0, 1);
      t = t * t * (3 - 2 * t);
      const alphaIndex = (y * w + x) * 4 + 3;
      data.data[alphaIndex] = Math.round(data.data[alphaIndex] * t);
    }
  }

  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createPatchGeometry(config: HdPatchConfig): THREE.BufferGeometry {
  const lonSpan = config.lonMax - config.lonMin;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= config.segmentsY; y += 1) {
    const v = y / config.segmentsY;
    const lat = THREE.MathUtils.lerp(config.latMax, config.latMin, v);
    for (let x = 0; x <= config.segmentsX; x += 1) {
      const u = x / config.segmentsX;
      let lon = config.lonMin + lonSpan * u;
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      const p = sphericalPosition(lon, lat, config.radius);
      vertices.push(p.x, p.y, p.z);
      uvs.push(u, 1 - v);
    }
  }

  const row = config.segmentsX + 1;
  for (let y = 0; y < config.segmentsY; y += 1) {
    for (let x = 0; x < config.segmentsX; x += 1) {
      const a = y * row + x;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function normalizedLon(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

function createDebugBoundary(config: HdPatchConfig): THREE.LineSegments {
  const pts: THREE.Vector3[] = [];
  const steps = 64;
  const add = (a: THREE.Vector3, b: THREE.Vector3) => {
    pts.push(a, b);
  };

  for (let i = 0; i < steps; i += 1) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const lon0 = normalizedLon(config.lonMin + (config.lonMax - config.lonMin) * t0);
    const lon1 = normalizedLon(config.lonMin + (config.lonMax - config.lonMin) * t1);
    const lat0 = THREE.MathUtils.lerp(config.latMin, config.latMax, t0);
    const lat1 = THREE.MathUtils.lerp(config.latMin, config.latMax, t1);
    const lonMaxNorm = normalizedLon(config.lonMax);

    add(sphericalPosition(lon0, config.latMin, config.radius - 0.4), sphericalPosition(lon1, config.latMin, config.radius - 0.4));
    add(sphericalPosition(lon0, config.latMax, config.radius - 0.4), sphericalPosition(lon1, config.latMax, config.radius - 0.4));
    add(sphericalPosition(config.lonMin, lat0, config.radius - 0.4), sphericalPosition(config.lonMin, lat1, config.radius - 0.4));
    add(sphericalPosition(lonMaxNorm, lat0, config.radius - 0.4), sphericalPosition(lonMaxNorm, lat1, config.radius - 0.4));
  }

  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0x66ffff,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false
  });
  const line = new THREE.LineSegments(geom, mat);
  line.renderOrder = -800;
  return line;
}

function getDebugColor(index: number): THREE.Color {
  const colors = [0xfff0cc, 0xccefff, 0xffcccc, 0xd6ffcc, 0xe5ccff, 0xffe0aa];
  return new THREE.Color(colors[index % colors.length]);
}

export function showHdPatchTextureDebugPanel(renderer: THREE.WebGLRenderer, options: TextureDebugOptions): void {
  const panelId = "textureDebugPanel";
  let panel = document.getElementById(panelId);
  if (!panel) {
    panel = document.createElement("pre");
    panel.id = panelId;
    document.body.appendChild(panel);
  }

  const panorama = getPanoramaDebugInfo();
  const lines = [
    "Texture debug",
    `maxTextureSize: ${renderer.capabilities.maxTextureSize}`,
    `panoramaLoaded: ${panorama?.loadedUrl ?? "unknown"}`,
    `panoramaUse8k: ${panorama?.use8k ?? "unknown"}`,
    `panoramaQualityMode: ${panorama?.qualityMode ?? "unknown"}`,
    `panoramaImage: ${panorama?.imageWidth ?? "?"}x${panorama?.imageHeight ?? "?"}`,
    `hdPatchesEnabled: ${options.enabled}`,
    `hdPatchDebug: ${options.debug}`,
    `hdPatchOpacity: ${options.opacity ?? "default"}`,
    `hdYaw: ${options.globalHdYaw ?? 0}`,
    "patches:",
    ...(options.statuses ?? []).map((item) => {
      const size = item.imageWidth && item.imageHeight ? `${item.imageWidth}x${item.imageHeight}` : "-";
      const error = item.error ? ` (${item.error})` : "";
      return `- ${item.id}: ${item.status} ${size} lon ${item.lonMin}..${item.lonMax} lat ${item.latMin}..${item.latMax}${error}`;
    })
  ];

  panel.textContent = lines.join("\n");
  Object.assign(panel.style, {
    position: "fixed",
    right: "12px",
    bottom: "12px",
    zIndex: "9999",
    maxWidth: "min(520px, calc(100vw - 24px))",
    maxHeight: "45vh",
    overflow: "auto",
    margin: "0",
    padding: "10px 12px",
    color: "#fff4c8",
    background: "rgba(5, 4, 2, 0.82)",
    border: "1px solid rgba(255, 214, 120, 0.45)",
    borderRadius: "8px",
    font: "12px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace",
    whiteSpace: "pre-wrap",
    pointerEvents: "none"
  });
}

export async function createHdPatches(scene: THREE.Scene, renderer: THREE.WebGLRenderer, options: HdPatchesOptions = {}): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "hd-patches";
  scene.add(group);

  const debug = Boolean(options.debug);
  const textureDebug = shouldShowTextureDebug(options);
  const globalHdYaw = getGlobalHdYaw();
  const opacity = getHdPatchOpacity(debug);
  const statuses: HdPatchStatus[] = [];
  const loaded: string[] = [];

  console.info(
    "[hd-patches] note",
    "HD patches can improve local pixel allocation, but native high-detail source images are still required for real clarity."
  );

  for (const [index, config] of HD_PATCHES.entries()) {
    if (!config.enabled) continue;
    try {
      const img = await loadImage(config.url);
      const texture = createFeatheredTexture(img, renderer, config.featherPx);
      const geometry = createPatchGeometry(config);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      });

      if (debug) {
        material.color = getDebugColor(index);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `hd-patch-${config.id}`;
      mesh.rotation.y = config.rotationY + THREE.MathUtils.degToRad(config.yawOffsetDeg + globalHdYaw);
      mesh.renderOrder = -850;
      group.add(mesh);

      if (debug) {
        const boundary = createDebugBoundary(config);
        boundary.rotation.y = mesh.rotation.y;
        group.add(boundary);
      }

      loaded.push(config.id);
      statuses.push({
        id: config.id,
        url: config.url,
        status: "loaded",
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
        lonMin: config.lonMin,
        lonMax: config.lonMax,
        latMin: config.latMin,
        latMax: config.latMax
      });

      console.info("[hd-patch] loaded", {
        id: config.id,
        url: config.url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        lonMin: config.lonMin,
        lonMax: config.lonMax,
        latMin: config.latMin,
        latMax: config.latMax,
        opacity,
        globalHdYaw
      });
    } catch (error) {
      statuses.push({
        id: config.id,
        url: config.url,
        status: "skipped",
        lonMin: config.lonMin,
        lonMax: config.lonMax,
        latMin: config.latMin,
        latMax: config.latMax,
        error: error instanceof Error ? error.message : String(error)
      });
      console.warn("[hd-patch] skipped", config.id, config.url, error);
    }
  }

  if (textureDebug) {
    showHdPatchTextureDebugPanel(renderer, {
      enabled: true,
      debug,
      opacity,
      globalHdYaw,
      statuses
    });
  }

  console.info("[hd-patches] complete", { loaded, opacity, globalHdYaw });
  return group;
}
