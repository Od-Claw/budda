import * as THREE from "three";

export type CubemapQuality = "4k" | "8k" | "auto";
export type CubemapSource = "quality" | "generated" | "generated4k" | "candidate";

export type CubemapSkyboxResult = {
  group: THREE.Group;
  quality: "4k" | "8k" | "generated" | "generated4k" | "candidate";
  urls: string[];
};

type CubemapFaceName = "px" | "nx" | "py" | "ny" | "pz" | "nz";

type FaceSpec = {
  name: CubemapFaceName;
  position: THREE.Vector3;
  rotation: THREE.Euler;
};

const FACE_NAMES: CubemapFaceName[] = ["px", "nx", "py", "ny", "pz", "nz"];

function getRequestedQuality(optionsQuality?: CubemapQuality): CubemapQuality {
  const params = new URLSearchParams(window.location.search);
  const queryQuality = params.get("cubeQuality");
  if (queryQuality === "4k" || queryQuality === "8k" || queryQuality === "auto") {
    return queryQuality;
  }
  return optionsQuality ?? "auto";
}

function getAutoQuality(renderer: THREE.WebGLRenderer): "4k" | "8k" {
  const maxTextureSize = renderer.capabilities.maxTextureSize;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  if (maxTextureSize >= 8192 && deviceMemory >= 6 && window.innerWidth >= 1200) {
    return "8k";
  }

  return "4k";
}

function resolveQuality(renderer: THREE.WebGLRenderer, optionsQuality?: CubemapQuality): "4k" | "8k" {
  const requested = getRequestedQuality(optionsQuality);
  if (requested === "4k" || requested === "8k") return requested;
  return getAutoQuality(renderer);
}

function getRequestedSource(): CubemapSource {
  const source = new URLSearchParams(window.location.search).get("cubeSource");
  if (source === "candidate") return "candidate";
  if (source === "generated4k") return "generated4k";
  return source === "generated" ? "generated" : "quality";
}

function getFaceUrls(quality: "4k" | "8k", source: CubemapSource = "quality"): string[] {
  const params = new URLSearchParams(window.location.search);
  if (source === "generated") {
    return FACE_NAMES.map((name) => `${import.meta.env.BASE_URL}assets/cubemap/generated/${name}.jpg`);
  }
  if (source === "generated4k") {
    return FACE_NAMES.map((name) => `${import.meta.env.BASE_URL}assets/cubemap/generated_4k/${name}.jpg`);
  }
  if (source === "candidate") {
    const cubeSet = params.get("cubeSet");
    if (!cubeSet) {
      console.warn("[cubemap] cubeSource=candidate requires cubeSet. Falling back to 4k cubemap.");
      return FACE_NAMES.map((name) => `${import.meta.env.BASE_URL}assets/cubemap/4k/${name}.jpg`);
    }
    return FACE_NAMES.map((name) => `${import.meta.env.BASE_URL}assets/cubemap/candidates/${encodeURIComponent(cubeSet)}/upscaled_4k/${name}.jpg`);
  }
  return FACE_NAMES.map((name) => `${import.meta.env.BASE_URL}assets/cubemap/${quality}/${name}.jpg`);
}

function configureTexture(texture: THREE.Texture, renderer: THREE.WebGLRenderer): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

async function loadFaceTextures(
  renderer: THREE.WebGLRenderer,
  quality: "4k" | "8k",
  source: CubemapSource = "quality"
): Promise<Array<{ name: CubemapFaceName; url: string; texture: THREE.Texture }>> {
  const loader = new THREE.TextureLoader();
  const urls = getFaceUrls(quality, source);

  return Promise.all(
    FACE_NAMES.map(async (name, index) => {
      const url = urls[index];
      const texture = await loader.loadAsync(url);
      configureTexture(texture, renderer);
      return { name, url, texture };
    })
  );
}

function createFaceSpecs(size: number): FaceSpec[] {
  const half = size / 2;
  return [
    {
      name: "nz",
      position: new THREE.Vector3(0, 0, -half),
      rotation: new THREE.Euler(0, 0, 0)
    },
    {
      name: "pz",
      position: new THREE.Vector3(0, 0, half),
      rotation: new THREE.Euler(0, Math.PI, 0)
    },
    {
      name: "px",
      position: new THREE.Vector3(half, 0, 0),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0)
    },
    {
      name: "nx",
      position: new THREE.Vector3(-half, 0, 0),
      rotation: new THREE.Euler(0, Math.PI / 2, 0)
    },
    {
      name: "py",
      position: new THREE.Vector3(0, half, 0),
      rotation: new THREE.Euler(Math.PI / 2, 0, 0)
    },
    {
      name: "ny",
      position: new THREE.Vector3(0, -half, 0),
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0)
    }
  ];
}

function createDebugLabel(text: string, position: THREE.Vector3): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create cubemap debug label");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255, 210, 90, 0.95)";
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  ctx.fillStyle = "#ffe08a";
  ctx.font = "700 46px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(80, 30, 1);
  sprite.renderOrder = -800;
  return sprite;
}

export async function createCubemapSkybox(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  options: {
    quality?: CubemapQuality;
    size?: number;
    rotationY?: number;
  } = {}
): Promise<CubemapSkyboxResult> {
  const debug = new URLSearchParams(window.location.search).get("cubeDebug") === "1";
  const source = getRequestedSource();
  const size = options.size ?? 1000;
  const selectedQuality = resolveQuality(renderer, options.quality);

  let quality: "4k" | "8k" = selectedQuality;
  let faceTextures: Array<{ name: CubemapFaceName; url: string; texture: THREE.Texture }>;

  try {
    faceTextures =
      source === "generated" || source === "generated4k" || source === "candidate"
        ? await loadFaceTextures(renderer, "4k", source)
        : await loadFaceTextures(renderer, quality, "quality");
  } catch (error) {
    if (source === "generated" || source === "generated4k" || source === "candidate" || quality !== "8k") throw error;
    console.warn("[cubemap] 8k failed, fallback to 4k", error);
    quality = "4k";
    faceTextures = await loadFaceTextures(renderer, quality, "quality");
  }

  const textureByName = new Map(faceTextures.map((face) => [face.name, face]));
  const group = new THREE.Group();
  group.name = "cubemap-skybox";
  group.rotation.y = options.rotationY ?? 0;
  group.renderOrder = -1000;

  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

  for (const spec of createFaceSpecs(size)) {
    const face = textureByName.get(spec.name);
    if (!face) throw new Error(`Missing cubemap face texture: ${spec.name}`);

    const material = new THREE.MeshBasicMaterial({
      map: face.texture,
      side: THREE.FrontSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `cubemap-face-${spec.name}`;
    mesh.position.copy(spec.position);
    mesh.rotation.copy(spec.rotation);
    mesh.renderOrder = -1000;
    group.add(mesh);

    if (debug) {
      group.add(createDebugLabel(spec.name, spec.position.clone().multiplyScalar(0.92)));
    }
  }

  scene.add(group);

  const urls = faceTextures.map((face) => face.url);
  console.info("[cubemap] loaded", {
    quality: source === "generated" || source === "generated4k" || source === "candidate" ? source : quality,
    source,
    urls,
    maxTextureSize: renderer.capabilities.maxTextureSize,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    debug
  });

  return { group, quality: source === "generated" || source === "generated4k" || source === "candidate" ? source : quality, urls };
}
