import * as THREE from "three";

export const PANORAMA_8K_IMAGE_URL = `${import.meta.env.BASE_URL}assets/guji_360_panorama_8192x4096_sharp_q95.jpg`;
export const PANORAMA_4K_IMAGE_URL = `${import.meta.env.BASE_URL}assets/guji_360_panorama_4096x2048.jpg`;

type QualityMode = "8k" | "4k" | "auto";

function getQualityMode(): QualityMode {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("quality");
  if (value === "8k") return "8k";
  if (value === "4k") return "4k";
  return "auto";
}

function canUse8K(renderer: THREE.WebGLRenderer): boolean {
  const mode = getQualityMode();
  const maxTextureSize = renderer.capabilities.maxTextureSize;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  if (mode === "4k") return false;
  if (mode === "8k") return maxTextureSize >= 8192;

  return maxTextureSize >= 8192 && deviceMemory >= 3 && window.innerWidth >= 800;
}

async function loadTexture(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export async function loadPanoramaTexture(renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const maxTextureSize = renderer.capabilities.maxTextureSize;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const qualityMode = getQualityMode();
  const use8k = canUse8K(renderer);
  const primaryUrl = use8k ? PANORAMA_8K_IMAGE_URL : PANORAMA_4K_IMAGE_URL;

  console.info("[panorama] loading", {
    primaryUrl,
    maxTextureSize,
    deviceMemory,
    use8k,
    qualityMode
  });

  try {
    return await loadTexture(primaryUrl, renderer);
  } catch (error) {
    if (!use8k) throw error;
    console.warn("[panorama] primary failed, fallback to 4K", error);
    return loadTexture(PANORAMA_4K_IMAGE_URL, renderer);
  }
}

export function createPanoramaSphere(texture: THREE.Texture, radius = 500): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 256, 128);
  geometry.scale(-1, 1, 1);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    depthWrite: false
  });

  const panoramaMesh = new THREE.Mesh(geometry, material);
  panoramaMesh.name = "gujiEquirectangularPanoramaSphere";
  panoramaMesh.rotation.y = -Math.PI / 2;
  panoramaMesh.renderOrder = -1000;
  return panoramaMesh;
}
