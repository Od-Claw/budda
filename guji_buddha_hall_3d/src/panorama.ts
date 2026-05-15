import * as THREE from "three";

export const PANORAMA_8K_URL = `${import.meta.env.BASE_URL}assets/guji_360_panorama_8192x4096_sharp_q95.jpg`;
export const PANORAMA_4K_URL = `${import.meta.env.BASE_URL}assets/guji_360_panorama_4096x2048.jpg`;

function shouldUse8kPanorama(renderer: THREE.WebGLRenderer): boolean {
  const maxTextureSize = renderer.capabilities.maxTextureSize;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return maxTextureSize >= 8192 && deviceMemory >= 4 && window.innerWidth >= 900;
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
  const use8k = shouldUse8kPanorama(renderer);
  const url = use8k ? PANORAMA_8K_URL : PANORAMA_4K_URL;

  console.info("Loading panorama:", url, {
    maxTextureSize,
    deviceMemory,
    use8k
  });

  try {
    return await loadTexture(url, renderer);
  } catch (error) {
    if (!use8k) throw error;
    console.warn("8K panorama failed, falling back to 4K:", error);
    return loadTexture(PANORAMA_4K_URL, renderer);
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
  panoramaMesh.name = "panorama-sphere";
  panoramaMesh.rotation.y = -Math.PI / 2;
  panoramaMesh.renderOrder = -1000;
  return panoramaMesh;
}
