import * as THREE from "three";

const FRONT_PATCH_URL = `${import.meta.env.BASE_URL}assets/guji_front_detail_patch_8192x4096.jpg`;

export interface FrontDetailPatchOptions {
  lonMin?: number;
  lonMax?: number;
  latMin?: number;
  latMax?: number;
  radius?: number;
  featherPx?: number;
  segmentsX?: number;
  segmentsY?: number;
  rotationY?: number;
  yawOffsetDeg?: number;
}

type ResolvedFrontDetailPatchOptions = Required<FrontDetailPatchOptions>;

const DEFAULT_OPTIONS: ResolvedFrontDetailPatchOptions = {
  lonMin: -55,
  lonMax: 55,
  latMin: -38,
  latMax: 42,
  radius: 496,
  featherPx: 260,
  segmentsX: 160,
  segmentsY: 96,
  rotationY: -Math.PI / 2,
  yawOffsetDeg: 0
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
    image.onerror = () => reject(new Error(`Front detail patch not found: ${url}`));
    image.src = url;
  });
}

function resolveOptions(options: FrontDetailPatchOptions = {}): ResolvedFrontDetailPatchOptions {
  return { ...DEFAULT_OPTIONS, ...options };
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
      const index = (y * width + x) * 4 + 3;
      data[index] = Math.round(data[index] * smoothT);
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

function createPatchGeometry(options: ResolvedFrontDetailPatchOptions): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= options.segmentsY; y += 1) {
    const v = y / options.segmentsY;
    const lat = THREE.MathUtils.lerp(options.latMin, options.latMax, v);

    for (let x = 0; x <= options.segmentsX; x += 1) {
      const u = x / options.segmentsX;
      const lon = THREE.MathUtils.lerp(options.lonMin, options.lonMax, u);
      const position = sphericalPosition(lon, lat, options.radius);
      positions.push(position.x, position.y, position.z);
      uvs.push(u, 1 - v);
    }
  }

  const row = options.segmentsX + 1;
  for (let y = 0; y < options.segmentsY; y += 1) {
    for (let x = 0; x < options.segmentsX; x += 1) {
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

export async function createFrontDetailPatch(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  options: FrontDetailPatchOptions = {}
): Promise<THREE.Mesh | null> {
  const resolvedOptions = resolveOptions(options);
  let image: HTMLImageElement;
  try {
    image = await loadImage(FRONT_PATCH_URL);
  } catch (error) {
    console.warn("[front-detail-patch] skipped", error);
    return null;
  }

  const texture = createFeatheredTexture(image, renderer, resolvedOptions.featherPx);
  const geometry = createPatchGeometry(resolvedOptions);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending
  });

  const patch = new THREE.Mesh(geometry, material);
  patch.name = "front-detail-patch";
  patch.rotation.y = resolvedOptions.rotationY + THREE.MathUtils.degToRad(resolvedOptions.yawOffsetDeg);
  patch.renderOrder = -900;
  scene.add(patch);

  console.info("[front-detail-patch] loaded", {
    url: FRONT_PATCH_URL,
    width: image.naturalWidth,
    height: image.naturalHeight,
    rotationY: resolvedOptions.rotationY,
    yawOffsetDeg: resolvedOptions.yawOffsetDeg,
    options: resolvedOptions
  });

  return patch;
}
