import * as THREE from "three";

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
};

const BASE = import.meta.env.BASE_URL;

const HD_PATCHES: HdPatchConfig[] = [
  { id: "front", url: `${BASE}assets/patches/guji_patch_front_8192x4096.jpg`, lonMin: -58, lonMax: 58, latMin: -40, latMax: 44, radius: 496, segmentsX: 220, segmentsY: 140, featherPx: 260, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "left-wall", url: `${BASE}assets/patches/guji_patch_left_4096x4096.jpg`, lonMin: -150, lonMax: -62, latMin: -34, latMax: 45, radius: 496, segmentsX: 160, segmentsY: 120, featherPx: 220, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "right-wall", url: `${BASE}assets/patches/guji_patch_right_4096x4096.jpg`, lonMin: 62, lonMax: 150, latMin: -34, latMax: 45, radius: 496, segmentsX: 160, segmentsY: 120, featherPx: 220, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "back", url: `${BASE}assets/patches/guji_patch_back_4096x4096.jpg`, lonMin: 150, lonMax: 210, latMin: -35, latMax: 35, radius: 496, segmentsX: 120, segmentsY: 90, featherPx: 200, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "ceiling", url: `${BASE}assets/patches/guji_patch_ceiling_4096x2048.jpg`, lonMin: -180, lonMax: 180, latMin: 35, latMax: 82, radius: 495, segmentsX: 240, segmentsY: 80, featherPx: 180, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
  { id: "floor", url: `${BASE}assets/patches/guji_patch_floor_4096x2048.jpg`, lonMin: -180, lonMax: 180, latMin: -82, latMax: -28, radius: 495, segmentsX: 240, segmentsY: 80, featherPx: 180, rotationY: -Math.PI / 2, yawOffsetDeg: 0, enabled: true },
];

function sphericalPosition(lonDeg: number, latDeg: number, radius: number): THREE.Vector3 {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    radius * Math.sin(lon) * Math.cos(lat),
    radius * Math.sin(lat),
    -radius * Math.cos(lon) * Math.cos(lat),
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
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      let t = THREE.MathUtils.clamp(edge / featherPx, 0, 1);
      t = t * t * (3 - 2 * t);
      data.data[(y * w + x) * 4 + 3] = Math.round(data.data[(y * w + x) * 4 + 3] * t);
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

  for (let y = 0; y <= config.segmentsY; y++) {
    const v = y / config.segmentsY;
    const lat = THREE.MathUtils.lerp(config.latMax, config.latMin, v);
    for (let x = 0; x <= config.segmentsX; x++) {
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
  for (let y = 0; y < config.segmentsY; y++) {
    for (let x = 0; x < config.segmentsX; x++) {
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

function createDebugBoundary(config: HdPatchConfig): THREE.LineSegments {
  const pts: THREE.Vector3[] = [];
  const steps = 64;
  const add = (a: THREE.Vector3, b: THREE.Vector3) => { pts.push(a, b); };

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const lon0 = config.lonMin + (config.lonMax - config.lonMin) * t0;
    const lon1 = config.lonMin + (config.lonMax - config.lonMin) * t1;
    add(sphericalPosition(lon0 > 180 ? lon0 - 360 : lon0, config.latMin, config.radius - 0.4), sphericalPosition(lon1 > 180 ? lon1 - 360 : lon1, config.latMin, config.radius - 0.4));
    add(sphericalPosition(lon0 > 180 ? lon0 - 360 : lon0, config.latMax, config.radius - 0.4), sphericalPosition(lon1 > 180 ? lon1 - 360 : lon1, config.latMax, config.radius - 0.4));
    const lat0 = THREE.MathUtils.lerp(config.latMin, config.latMax, t0);
    const lat1 = THREE.MathUtils.lerp(config.latMin, config.latMax, t1);
    add(sphericalPosition(config.lonMin, lat0, config.radius - 0.4), sphericalPosition(config.lonMin, lat1, config.radius - 0.4));
    const lonMaxNorm = config.lonMax > 180 ? config.lonMax - 360 : config.lonMax;
    add(sphericalPosition(lonMaxNorm, lat0, config.radius - 0.4), sphericalPosition(lonMaxNorm, lat1, config.radius - 0.4));
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
  const line = new THREE.LineSegments(geom, mat);
  line.renderOrder = -800;
  return line;
}

export async function createHdPatches(scene: THREE.Scene, renderer: THREE.WebGLRenderer, options: HdPatchesOptions = {}) {
  const group = new THREE.Group();
  group.name = "hd-patches";
  scene.add(group);

  const loaded: string[] = [];
  for (const config of HD_PATCHES) {
    if (!config.enabled) continue;
    try {
      const img = await loadImage(config.url);
      const texture = createFeatheredTexture(img, renderer, config.featherPx);
      const geometry = createPatchGeometry(config);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });
      if (options.debug) {
        material.opacity = 0.78;
        material.color = new THREE.Color(0xfff4d0);
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `hd-patch-${config.id}`;
      mesh.rotation.y = config.rotationY + THREE.MathUtils.degToRad(config.yawOffsetDeg);
      mesh.renderOrder = -850;
      group.add(mesh);
      if (options.debug) group.add(createDebugBoundary(config));
      loaded.push(config.id);
      console.info("[hd-patch] loaded", { id: config.id, url: config.url, width: img.naturalWidth, height: img.naturalHeight, lonMin: config.lonMin, lonMax: config.lonMax, latMin: config.latMin, latMax: config.latMax });
    } catch (error) {
      console.warn("[hd-patch] skipped", config.id, config.url, error);
    }
  }
  console.info("[hd-patches] complete", { loaded });
  return group;
}
