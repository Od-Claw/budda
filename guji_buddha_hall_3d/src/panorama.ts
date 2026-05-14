import * as THREE from "three";

export const PANORAMA_IMAGE_URL = `${import.meta.env.BASE_URL}assets/guji_360_panorama_4096x2048.jpg`;

export async function loadPanoramaTexture(src = PANORAMA_IMAGE_URL): Promise<THREE.Texture> {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createPanoramaSphere(texture: THREE.Texture, radius = 500): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 128, 72);
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
