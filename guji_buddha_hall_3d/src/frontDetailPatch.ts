import * as THREE from "three";

const FRONT_PATCH_URL = `${import.meta.env.BASE_URL}assets/guji_front_detail_patch_8192x4096.jpg`;
const LON_MIN = -55;
const LON_MAX = 55;
const LAT_MIN = -38;
const LAT_MAX = 42;
const PATCH_RADIUS = 496;
const SEGMENTS_X = 128;
const SEGMENTS_Y = 80;
const FEATHER_PX = 220;

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

function createFeatheredTexture(image: HTMLImageElement, renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
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
      const rawT = THREE.MathUtils.clamp(edge / FEATHER_PX, 0, 1);
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

function createPatchGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= SEGMENTS_Y; y += 1) {
    const v = y / SEGMENTS_Y;
    const lat = THREE.MathUtils.lerp(LAT_MIN, LAT_MAX, v);

    for (let x = 0; x <= SEGMENTS_X; x += 1) {
      const u = x / SEGMENTS_X;
      const lon = THREE.MathUtils.lerp(LON_MIN, LON_MAX, u);
      const position = sphericalPosition(lon, lat, PATCH_RADIUS);
      positions.push(position.x, position.y, position.z);
      uvs.push(u, 1 - v);
    }
  }

  const row = SEGMENTS_X + 1;
  for (let y = 0; y < SEGMENTS_Y; y += 1) {
    for (let x = 0; x < SEGMENTS_X; x += 1) {
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
  renderer: THREE.WebGLRenderer
): Promise<THREE.Mesh | null> {
  let image: HTMLImageElement;
  try {
    image = await loadImage(FRONT_PATCH_URL);
  } catch (error) {
    console.warn("[front-detail-patch] skipped", error);
    return null;
  }

  const texture = createFeatheredTexture(image, renderer);
  const geometry = createPatchGeometry();
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
  patch.renderOrder = -900;
  scene.add(patch);

  console.info("[front-detail-patch] loaded", {
    url: FRONT_PATCH_URL,
    width: image.naturalWidth,
    height: image.naturalHeight
  });

  return patch;
}
