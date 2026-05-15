import * as THREE from "three";

export type HdPatchConfig = {
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

export type HdPatchOptions = {
  debug?: boolean;
  patches?: HdPatchConfig[];
};

const PATCH_BASE_URL = `${import.meta.env.BASE_URL}assets/patches/`;

export const HD_PATCHES: HdPatchConfig[] = [
  {
    id: "front",
    url: `${PATCH_BASE_URL}guji_patch_front_8192x4096.jpg`,
    lonMin: -58,
    lonMax: 58,
    latMin: -40,
    latMax: 44,
    radius: 496,
    segmentsX: 220,
    segmentsY: 140,
    featherPx: 260,
    rotationY: -Math.PI / 2,
    yawOffsetDeg: 0,
    enabled: true
  },
  {
    id: "left-wall",
    url: `${PATCH_BASE_URL}guji_patch_left_4096x4096.jpg`,
    lonMin: -150,
    lonMax: -62,
    latMin: -34,
    latMax: 45,
    radius: 496,
    segmentsX: 160,
    segmentsY: 120,
    featherPx: 220,
    rotationY: -Math.PI / 2,
    yawOffsetDeg: 0,
    enabled: true
  },
  {
    id: "right-wall",
    url: `${PATCH_BASE_URL}guji_patch_right_4096x4096.jpg`,
    lonMin: 62,
    lonMax: 150,
    latMin: -34,
    latMax: 45,
    radius: 496,
    segmentsX: 160,
    segmentsY: 120,
    featherPx: 220,
    rotationY: -Math.PI / 2,
    yawOffsetDeg: 0,
    enabled: true
  },
  {
    id: "back",
    url: `${PATCH_BASE_URL}guji_patch_back_4096x4096.jpg`,
    lonMin: 150,
    lonMax: 210,
    latMin: -35,
    latMax: 35,
    radius: 496,
    segmentsX: 120,
    segmentsY: 90,
    featherPx: 200,
    rotationY: -Math.PI / 2,
    yawOffsetDeg: 0,
    enabled: true
  },
  {
    id: "ceiling",
    url: `${PATCH_BASE_URL}guji_patch_ceiling_4096x2048.jpg`,
    lonMin: -180,
    lonMax: 180,
    latMin: 35,
    latMax: 82,
    radius: 495,
    segmentsX: 240,
    segmentsY: 80,
    featherPx: 180,
    rotationY: -Math.PI / 2,
    yawOffsetDeg: 0,
    enabled: true
  },
  {
    id: "floor",
    url: `${PATCH_BASE_URL}guji_patch_floor_4096x2048.jpg`,
    lonMin: -180,
    lonMax: 180,
    latMin: -82,
    latMax: -28,
    radius: 495,
    segmentsX: 240,
    segmentsY: 80,
    featherPx: 180,
    rotationY: -Math.PI / 2,
    yawOffsetDeg: 0,
    enabled: true
  }
];

const DEBUG_COLORS: Record<string, THREE.ColorRepresentation> = {
  front: 0xfff0cc,
  "left-wall": 0xcce8ff,
  "right-wall": 0xffccee,
  back: 0xccffd6,
  ceiling: 0xe7ccff,
  floor: 0xffe1aa
};

function sphericalPosition(lonDeg: number, latDeg: number, radius: number): THREE.Vector3 {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  const x = radius * Math.sin(lon) * Math.cos(lat);
  const y = radius * Math.sin(lat);
  const z = -radius * Math.cos(lon) * Math.cos(lat);
  return new THREE.Vector3(x, y, z);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`HD patch not found: ${url}`));
    image.src = url;
  });
}

function createFeatheredTexture(
  image: HTMLImageElement,
  renderer: THREE.WebGLRenderer,
  featherPx: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      const rawT = THREE.MathUtils.clamp(edge / featherPx, 0, 1);
      const smoothT = rawT * rawT * (3 - 2 * rawT);
      data[(y * width + x) * 4 + 3] = Math.round(data[(y * width + x) * 4 + 3] * smoothT);
    }
  }

  ctx.putImageData(imageData, 0, 0);

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
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= config.segmentsY; y += 1) {
    const v = y / config.segmentsY;
    const lat = THREE.MathUtils.lerp(config.latMin, config.latMax, v);

    for (let x = 0; x <= config.segmentsX; x += 1) {
      const u = x / config.segmentsX;
      const lon = THREE.MathUtils.lerp(config.lonMin, config.lonMax, u);
      const position = sphericalPosition(lon, lat, config.radius);
      positions.push(position.x, position.y, position.z);
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
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createDebugBoundary(config: HdPatchConfig): THREE.LineSegments {
  const positions: number[] = [];
  const pushSegment = (a: THREE.Vector3, b: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  const samplesX = 72;
  const samplesY = 48;

  for (let index = 0; index < samplesX; index += 1) {
    const t0 = index / samplesX;
    const t1 = (index + 1) / samplesX;
    const lon0 = THREE.MathUtils.lerp(config.lonMin, config.lonMax, t0);
    const lon1 = THREE.MathUtils.lerp(config.lonMin, config.lonMax, t1);
    pushSegment(sphericalPosition(lon0, config.latMin, config.radius - 1), sphericalPosition(lon1, config.latMin, config.radius - 1));
    pushSegment(sphericalPosition(lon0, config.latMax, config.radius - 1), sphericalPosition(lon1, config.latMax, config.radius - 1));
  }

  for (let index = 0; index < samplesY; index += 1) {
    const t0 = index / samplesY;
    const t1 = (index + 1) / samplesY;
    const lat0 = THREE.MathUtils.lerp(config.latMin, config.latMax, t0);
    const lat1 = THREE.MathUtils.lerp(config.latMin, config.latMax, t1);
    pushSegment(sphericalPosition(config.lonMin, lat0, config.radius - 1), sphericalPosition(config.lonMin, lat1, config.radius - 1));
    pushSegment(sphericalPosition(config.lonMax, lat0, config.radius - 1), sphericalPosition(config.lonMax, lat1, config.radius - 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x20f4ff,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });

  const boundary = new THREE.LineSegments(geometry, material);
  boundary.name = `hd-patch-boundary-${config.id}`;
  boundary.renderOrder = -820;
  boundary.frustumCulled = false;
  return boundary;
}

async function createSinglePatch(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  config: HdPatchConfig,
  debug: boolean
): Promise<THREE.Mesh | null> {
  if (!config.enabled) return null;

  let image: HTMLImageElement;
  try {
    image = await loadImage(config.url);
  } catch (error) {
    console.warn("[hd-patches] skipped", { id: config.id, url: config.url, error });
    return null;
  }

  const texture = createFeatheredTexture(image, renderer, config.featherPx);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
  });

  if (debug) {
    material.opacity = 0.75;
    material.color = new THREE.Color(DEBUG_COLORS[config.id] ?? 0xfff0cc);
  }

  const mesh = new THREE.Mesh(createPatchGeometry(config), material);
  mesh.name = `hd-patch-${config.id}`;
  mesh.rotation.y = config.rotationY + THREE.MathUtils.degToRad(config.yawOffsetDeg);
  mesh.renderOrder = -850;
  mesh.frustumCulled = false;

  if (debug) {
    mesh.add(createDebugBoundary(config));
  }

  scene.add(mesh);

  console.info("[hd-patches] loaded", {
    id: config.id,
    url: config.url,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    lonMin: config.lonMin,
    lonMax: config.lonMax,
    latMin: config.latMin,
    latMax: config.latMax,
    rotationY: config.rotationY,
    yawOffsetDeg: config.yawOffsetDeg,
    debug
  });

  return mesh;
}

export async function createHdPatches(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  options: HdPatchOptions = {}
): Promise<THREE.Mesh[]> {
  const debug = options.debug ?? false;
  const patches = options.patches ?? HD_PATCHES;
  const meshes: THREE.Mesh[] = [];

  for (const patch of patches) {
    const mesh = await createSinglePatch(scene, renderer, patch, debug);
    if (mesh) meshes.push(mesh);
  }

  console.info("[hd-patches] summary", {
    requested: patches.filter((patch) => patch.enabled).length,
    loaded: meshes.length,
    debug
  });
  console.info(
    "[hd-patches] clarity depends on native high-detail patch images; upscaled crops from a blurry panorama will still look limited."
  );

  return meshes;
}
