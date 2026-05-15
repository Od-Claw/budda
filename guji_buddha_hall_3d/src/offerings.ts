import * as THREE from "three";
import { OfferingRecord, OfferingType, saveOfferings } from "./storage";

export const OFFERING_LABELS: Record<OfferingType, string> = {
  flower: "鮮花",
  lotus: "蓮花",
  water: "水杯",
  fruit: "果盤",
  incense: "香",
  butterLamp: "酥油燈",
  gold: "金色供品"
};

interface OfferingSlot {
  x: number;
  y: number;
  z: number;
}

interface OfferingVisual {
  group: THREE.Group;
  createdAt: number;
  smokeSprites: THREE.Sprite[];
  flameSprites: THREE.Sprite[];
}

type OfferingPlacementConfig = {
  screenX: number;
  screenY: number;
  distance: number;
  scale: number;
};

const DEFAULT_OFFERING_PLACEMENT: OfferingPlacementConfig = {
  screenX: 0.5,
  screenY: 0.705,
  distance: 48,
  scale: 0.62
};

const OFFERING_SLOTS: OfferingSlot[] = [
  { x: -2.8, y: 0.0, z: 0.0 },
  { x: -1.8, y: 0.0, z: -0.15 },
  { x: -0.9, y: 0.0, z: 0.12 },
  { x: 0.0, y: 0.0, z: -0.18 },
  { x: 0.9, y: 0.0, z: 0.12 },
  { x: 1.8, y: 0.0, z: -0.15 },
  { x: 2.8, y: 0.0, z: 0.0 },
  { x: -1.4, y: -0.25, z: 0.65 },
  { x: 1.4, y: -0.25, z: 0.65 },
  { x: 0.0, y: -0.25, z: 0.85 }
];

const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

const OFFERING_ARTWORK: Record<OfferingType, { url: string; width: number; height: number; y: number }> = {
  flower: { url: assetUrl("assets/offerings/flower.png"), width: 2.35, height: 2.35, y: 1.36 },
  lotus: { url: assetUrl("assets/offerings/lotus.png"), width: 2.25, height: 2.25, y: 1.08 },
  water: { url: assetUrl("assets/offerings/water.png"), width: 1.7, height: 1.7, y: 1.0 },
  fruit: { url: assetUrl("assets/offerings/fruit.png"), width: 2.15, height: 2.15, y: 1.02 },
  incense: { url: assetUrl("assets/offerings/incense.png"), width: 2.1, height: 2.1, y: 1.28 },
  butterLamp: { url: assetUrl("assets/offerings/lamp.png"), width: 1.9, height: 1.9, y: 1.02 },
  gold: { url: assetUrl("assets/offerings/gold.png"), width: 2.15, height: 2.15, y: 1.02 }
};

const textureLoader = new THREE.TextureLoader();
const artworkCache = new Map<OfferingType, THREE.Texture>();

function makeBasicMaterial(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: true,
    depthWrite: opacity >= 1
  });
}

function loadArtwork(type: OfferingType): THREE.Texture {
  const cached = artworkCache.get(type);
  if (cached) return cached;
  const texture = textureLoader.load(OFFERING_ARTWORK[type].url, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.needsUpdate = true;
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  artworkCache.set(type, texture);
  return texture;
}

function createCanvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 160): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const flameTexture = createCanvasTexture((ctx, size) => {
  const cx = size / 2;
  const cy = size * 0.58;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.43);
  glow.addColorStop(0, "rgba(255, 255, 218, 1)");
  glow.addColorStop(0.25, "rgba(255, 211, 88, 0.95)");
  glow.addColorStop(0.58, "rgba(255, 112, 28, 0.68)");
  glow.addColorStop(1, "rgba(255, 112, 28, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.10);
  ctx.bezierCurveTo(size * 0.78, size * 0.38, size * 0.66, size * 0.80, cx, size * 0.94);
  ctx.bezierCurveTo(size * 0.28, size * 0.76, size * 0.28, size * 0.42, cx, size * 0.10);
  ctx.fill();
});

const smokeTexture = createCanvasTexture((ctx, size) => {
  const glow = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size * 0.45);
  glow.addColorStop(0, "rgba(245, 238, 222, 0.24)");
  glow.addColorStop(0.5, "rgba(224, 220, 208, 0.12)");
  glow.addColorStop(1, "rgba(224, 220, 208, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
});

function createArtworkSprite(type: OfferingType): THREE.Sprite {
  const config = OFFERING_ARTWORK[type];
  const material = new THREE.SpriteMaterial({
    map: loadArtwork(type),
    transparent: true,
    alphaTest: 0.04,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = `formal-offering-${type}`;
  sprite.position.set(0, config.y, 0.06);
  sprite.scale.set(config.width, config.height, 1);
  sprite.renderOrder = 16;
  return sprite;
}

function createSmallBase(type: OfferingType): THREE.Mesh {
  const radius = type === "water" || type === "butterLamp" ? 0.48 : 0.72;
  const color = type === "water" ? 0xc8e8ff : 0xc28a36;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, 0.12, 32), makeBasicMaterial(color, 0.72));
  base.name = `offering-base-${type}`;
  base.position.y = 0.06;
  return base;
}

function createSprite(texture: THREE.Texture, width: number, height: number, renderOrder: number, additive = false): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = renderOrder;
  return sprite;
}

function createFormalOffering(type: OfferingType, smokeSprites: THREE.Sprite[], flameSprites: THREE.Sprite[]): THREE.Group {
  const group = new THREE.Group();
  group.name = `formal-offering-${type}`;
  group.add(createSmallBase(type));
  group.add(createArtworkSprite(type));

  if (type === "incense") {
    for (let index = 0; index < 3; index += 1) {
      const smoke = createSprite(smokeTexture, 0.38, 0.56, 22);
      smoke.position.set((index - 1) * 0.11, 2.2 + index * 0.16, 0.08);
      smoke.material.opacity = 0.16;
      smokeSprites.push(smoke);
      group.add(smoke);
    }
  }

  if (type === "butterLamp") {
    const flame = createSprite(flameTexture, 0.48, 0.68, 24, true);
    flame.position.set(0, 1.56, 0.09);
    flameSprites.push(flame);
    group.add(flame);
  }

  return group;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else if (material) material.dispose();
  });
}

function getOfferingPlacementFromUrl(): OfferingPlacementConfig {
  const params = new URLSearchParams(window.location.search);
  const read = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) ? value : fallback;
  };

  return {
    screenX: read("offX", DEFAULT_OFFERING_PLACEMENT.screenX),
    screenY: read("offY", DEFAULT_OFFERING_PLACEMENT.screenY),
    distance: read("offD", DEFAULT_OFFERING_PLACEMENT.distance),
    scale: read("offScale", DEFAULT_OFFERING_PLACEMENT.scale)
  };
}

function screenPointToWorldAtDistance(
  camera: THREE.Camera,
  screenX: number,
  screenY: number,
  distance: number
): THREE.Vector3 {
  const ndc = new THREE.Vector3(screenX * 2 - 1, -(screenY * 2 - 1), 0.5);
  ndc.unproject(camera);
  const direction = ndc.sub(camera.position).normalize();
  return camera.position.clone().add(direction.multiplyScalar(distance));
}

export class OfferingManager {
  readonly root: THREE.Group;
  private records: OfferingRecord[] = [];
  private visuals: OfferingVisual[] = [];
  private camera?: THREE.Camera;
  private placement = getOfferingPlacementFromUrl();
  private offeringDebug = new URLSearchParams(window.location.search).get("offeringDebug") === "1";
  private loggedScreenPosition = false;

  constructor(scene: THREE.Scene, camera?: THREE.Camera) {
    this.camera = camera;
    this.root = new THREE.Group();
    this.root.name = "offerings-root";
    this.applyPlacement();
    this.installDebugControls();
    scene.add(this.root);
  }

  restore(records: OfferingRecord[]): void {
    this.load(records);
  }

  load(records: OfferingRecord[]): void {
    this.records = [...records];
    this.rebuild();
  }

  add(type: OfferingType): void {
    const record: OfferingRecord = {
      id: `offering-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      createdAt: new Date().toISOString(),
      slotIndex: this.records.length % OFFERING_SLOTS.length
    };
    this.records.push(record);
    saveOfferings(this.records);
    this.rebuild(record.id);
    console.info("Offering added", type);
  }

  clear(): void {
    this.records = [];
    saveOfferings([]);
    this.rebuild();
  }

  update(time: number): void {
    this.faceCamera();
    this.logScreenPositionOnce();

    this.visuals.forEach((visual) => {
      const age = Math.max(0, time - visual.createdAt);
      if (visual.group.scale.x < 1) {
        const t = Math.min(1, age / 0.25);
        const eased = 1 - Math.pow(1 - t, 3);
        visual.group.scale.setScalar(eased);
      }

      visual.smokeSprites.forEach((sprite, index) => {
        const phase = (time * 0.12 + index * 0.28) % 1;
        sprite.position.y = 2.18 + phase * 0.76;
        sprite.position.x = (index - 1) * 0.11 + Math.sin(time * 0.8 + index) * 0.055;
        sprite.material.opacity = (1 - phase) * 0.18;
        sprite.scale.setScalar(0.34 + phase * 0.2);
      });

      visual.flameSprites.forEach((sprite, index) => {
        const flicker = 0.9 + Math.sin(time * 9 + index) * 0.08 + Math.sin(time * 15.5) * 0.04;
        sprite.scale.set(0.48 * flicker, 0.68 * (0.95 + flicker * 0.08), 1);
        sprite.material.opacity = 0.74 + Math.sin(time * 8 + index) * 0.12;
      });
    });
  }

  recalibratePlacement(): void {
    this.applyPlacement();
    this.faceCamera();
    this.logPlacement();
  }

  private rebuild(animatedRecordId?: string): void {
    this.root.children.forEach(disposeObject);
    this.root.clear();
    this.visuals = [];

    this.records.forEach((record) => {
      const slot = OFFERING_SLOTS[record.slotIndex % OFFERING_SLOTS.length];
      const group = new THREE.Group();
      group.name = `offering-${record.type}-${record.id}`;
      group.position.set(slot.x, slot.y, slot.z);
      group.renderOrder = 12;

      const smokeSprites: THREE.Sprite[] = [];
      const flameSprites: THREE.Sprite[] = [];
      group.add(createFormalOffering(record.type, smokeSprites, flameSprites));
      if (record.id === animatedRecordId) group.scale.setScalar(0.01);

      this.root.add(group);
      this.visuals.push({
        group,
        createdAt: record.id === animatedRecordId ? performance.now() / 1000 : -999,
        smokeSprites,
        flameSprites
      });
    });

    this.faceCamera();
  }

  private faceCamera(): void {
    if (!this.camera) return;
    this.root.lookAt(this.camera.position.x, this.root.position.y, this.camera.position.z);
  }

  private applyPlacement(): void {
    if (this.camera) {
      this.root.position.copy(
        screenPointToWorldAtDistance(
          this.camera,
          this.placement.screenX,
          this.placement.screenY,
          this.placement.distance
        )
      );
    }
    this.root.scale.setScalar(this.placement.scale);
  }

  private installDebugControls(): void {
    if (!this.offeringDebug || !this.camera) return;
    this.logPlacement();
    window.addEventListener("keydown", (event) => {
      let handled = true;
      if (event.key === "ArrowLeft") this.placement.screenX -= 0.005;
      else if (event.key === "ArrowRight") this.placement.screenX += 0.005;
      else if (event.key === "ArrowUp") this.placement.screenY -= 0.005;
      else if (event.key === "ArrowDown") this.placement.screenY += 0.005;
      else if (event.key === "PageUp") this.placement.distance += 1;
      else if (event.key === "PageDown") this.placement.distance -= 1;
      else if (event.key === "[") this.placement.scale -= 0.03;
      else if (event.key === "]") this.placement.scale += 0.03;
      else handled = false;

      if (!handled) return;
      event.preventDefault();
      this.placement.screenX = THREE.MathUtils.clamp(this.placement.screenX, 0.05, 0.95);
      this.placement.screenY = THREE.MathUtils.clamp(this.placement.screenY, 0.05, 0.95);
      this.placement.distance = Math.max(5, this.placement.distance);
      this.placement.scale = Math.max(0.1, this.placement.scale);
      this.recalibratePlacement();
      console.info(
        "[offerings] tuned url",
        `?offX=${this.placement.screenX.toFixed(3)}&offY=${this.placement.screenY.toFixed(3)}&offD=${this.placement.distance.toFixed(1)}&offScale=${this.placement.scale.toFixed(2)}`
      );
    });
  }

  private logPlacement(): void {
    if (!this.offeringDebug) return;
    console.info("[offerings] placement", {
      ...this.placement,
      rootPosition: this.root.position.clone()
    });
  }

  private logScreenPositionOnce(): void {
    if (!this.offeringDebug || this.loggedScreenPosition || !this.camera || this.records.length === 0) return;
    const world = new THREE.Vector3();
    this.root.getWorldPosition(world);
    world.project(this.camera);
    console.info("Offerings root screen position", {
      x: Math.round((world.x * 0.5 + 0.5) * window.innerWidth),
      y: Math.round((-world.y * 0.5 + 0.5) * window.innerHeight),
      target: "x ~= 50%, y ~= 72%-78%"
    });
    this.loggedScreenPosition = true;
  }
}
