import * as THREE from "three";
import { HotspotConfig, lonLatToVector3, makeHotspotTexture } from "./hotspots";
import { LampRecord } from "./storage";

export interface CandleManagerOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  radius?: number;
  debug?: boolean;
  yawOffsetDeg?: number;
}

interface LampVisual {
  config: HotspotConfig;
  marker: THREE.Sprite;
  clickTarget: THREE.Sprite;
  label?: THREE.Sprite;
  flame?: THREE.Sprite;
  glow?: THREE.Sprite;
  light?: THREE.PointLight;
  record?: LampRecord;
  seed: number;
  baseFlameWidth: number;
  baseFlameHeight: number;
  baseGlowWidth: number;
  baseGlowHeight: number;
  baseIntensity: number;
  baseFlamePosition?: THREE.Vector3;
  baseGlowPosition?: THREE.Vector3;
}

function isMainLamp(config: HotspotConfig): boolean {
  return config.size === "main" || config.id.startsWith("main-");
}

function makeFlameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.56;
  const outer = ctx.createRadialGradient(cx, cy, 2, cx, cy, 96);
  outer.addColorStop(0, "rgba(255,255,232,1)");
  outer.addColorStop(0.18, "rgba(255,218,92,0.98)");
  outer.addColorStop(0.46, "rgba(255,113,28,0.84)");
  outer.addColorStop(0.82, "rgba(255,66,10,0.28)");
  outer.addColorStop(1, "rgba(255,66,10,0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(cx, 14);
  ctx.bezierCurveTo(148, 82, 116, 184, cx, 224);
  ctx.bezierCurveTo(36, 176, 42, 80, cx, 14);
  ctx.fill();

  const inner = ctx.createRadialGradient(cx, cy + 14, 2, cx, cy + 14, 40);
  inner.addColorStop(0, "rgba(255,255,250,1)");
  inner.addColorStop(0.42, "rgba(255,233,132,0.94)");
  inner.addColorStop(1, "rgba(255,233,132,0)");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(cx, 72);
  ctx.bezierCurveTo(110, 120, 100, 176, cx, 208);
  ctx.bezierCurveTo(58, 164, 62, 118, cx, 72);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const glow = ctx.createRadialGradient(128, 128, 5, 128, 128, 118);
  glow.addColorStop(0, "rgba(255, 233, 145, 0.58)");
  glow.addColorStop(0.36, "rgba(255, 168, 56, 0.26)");
  glow.addColorStop(1, "rgba(255, 120, 34, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeClickTargetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "rgba(255,255,255,0.002)";
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.font = "700 32px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0,0,0,0.82)";
  ctx.strokeText(text, 256, 64);
  ctx.fillStyle = "rgba(90,240,255,0.98)";
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function lampPosition(config: HotspotConfig, radius: number, yawOffsetDeg: number): THREE.Vector3 {
  return lonLatToVector3(config.lon + yawOffsetDeg, config.lat, radius);
}

export class CandleManager {
  readonly clickable: THREE.Object3D[] = [];
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private radius: number;
  private debug: boolean;
  private yawOffsetDeg: number;
  private visuals = new Map<string, LampVisual>();
  private unlitTexture = makeHotspotTexture("lamp");
  private litTexture = makeHotspotTexture("lampLit");
  private flameTexture = makeFlameTexture();
  private glowTexture = makeGlowTexture();
  private clickTargetTexture = makeClickTargetTexture();

  constructor(options: CandleManagerOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.radius = options.radius ?? 488;
    this.debug = options.debug ?? false;
    this.yawOffsetDeg = options.yawOffsetDeg ?? 0;
  }

  create(hotspots: HotspotConfig[], records: LampRecord[]): void {
    if (this.debug) {
      console.table(hotspots.map(({ id, label, lon, lat, size }) => ({ id, label, lon, lat, size: size ?? "wall" })));
    }

    const recordMap = new Map(records.map((record) => [record.id, record]));

    hotspots.forEach((config) => {
      const main = isMainLamp(config);
      const markerMaterial = new THREE.SpriteMaterial({
        map: recordMap.has(config.id) ? this.litTexture : this.unlitTexture,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const marker = new THREE.Sprite(markerMaterial);
      marker.name = `lampMarker-${config.id}`;
      marker.position.copy(lampPosition(config, this.radius, this.yawOffsetDeg));
      marker.scale.set(main ? 20 : 16, main ? 20 : 16, 1);
      marker.renderOrder = 80;
      marker.frustumCulled = false;
      marker.userData = { type: "lamp", id: config.id, label: config.label };
      this.scene.add(marker);

      const clickMaterial = new THREE.SpriteMaterial({
        map: this.clickTargetTexture,
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
        depthTest: false
      });
      const clickTarget = new THREE.Sprite(clickMaterial);
      clickTarget.name = `lampClickTarget-${config.id}`;
      clickTarget.position.copy(marker.position).multiplyScalar(0.998);
      clickTarget.scale.set(main ? 34 : 26, main ? 34 : 26, 1);
      clickTarget.renderOrder = 90;
      clickTarget.frustumCulled = false;
      clickTarget.userData = { type: "lamp", id: config.id, label: config.label };
      this.scene.add(clickTarget);
      this.clickable.push(clickTarget);

      const visual: LampVisual = {
        config,
        marker,
        clickTarget,
        record: recordMap.get(config.id),
        seed: Math.random() * Math.PI * 2,
        baseFlameWidth: main ? 28 : 21,
        baseFlameHeight: main ? 34 : 26,
        baseGlowWidth: main ? 62 : 45,
        baseGlowHeight: main ? 74 : 56,
        baseIntensity: main ? 1.45 : 0.95
      };

      if (this.debug) {
        visual.label = this.createDebugLabel(config);
        this.scene.add(visual.label);
      }

      this.visuals.set(config.id, visual);
      if (visual.record) this.addFlame(visual);
    });
  }

  setLit(config: HotspotConfig, record: LampRecord): void {
    const visual = this.visuals.get(config.id);
    if (!visual) return;
    visual.record = record;
    const markerMaterial = visual.marker.material as THREE.SpriteMaterial;
    markerMaterial.map = this.litTexture;
    markerMaterial.needsUpdate = true;
    if (!visual.flame) this.addFlame(visual);
  }

  getRecord(id: string): LampRecord | undefined {
    return this.visuals.get(id)?.record;
  }

  clear(): void {
    this.visuals.forEach((visual) => {
      visual.record = undefined;
      const markerMaterial = visual.marker.material as THREE.SpriteMaterial;
      markerMaterial.map = this.unlitTexture;
      markerMaterial.needsUpdate = true;
      if (visual.flame) {
        this.scene.remove(visual.flame);
        const index = this.clickable.indexOf(visual.flame);
        if (index >= 0) this.clickable.splice(index, 1);
      }
      if (visual.glow) this.scene.remove(visual.glow);
      if (visual.light) this.scene.remove(visual.light);
      visual.flame = undefined;
      visual.glow = undefined;
      visual.light = undefined;
      visual.baseFlamePosition = undefined;
      visual.baseGlowPosition = undefined;
    });
  }

  update(time: number): void {
    this.visuals.forEach((visual) => {
      visual.marker.lookAt(this.camera.position);
      visual.clickTarget.lookAt(this.camera.position);
      if (visual.label) visual.label.lookAt(this.camera.position);

      if (!visual.record) {
        const pulse = 1 + Math.sin(time * 2.2 + visual.seed) * 0.1;
        const base = isMainLamp(visual.config) ? 20 : 16;
        visual.marker.scale.setScalar(base * pulse);
        return;
      }

      visual.marker.scale.setScalar(isMainLamp(visual.config) ? 18 : 14);
      const flicker = 0.85 + Math.sin(time * 8 + visual.seed) * 0.12 + Math.sin(time * 17 + visual.seed) * 0.05;
      const yOffset = Math.sin(time * 6 + visual.seed) * 0.9;

      if (visual.flame && visual.baseFlamePosition) {
        visual.flame.scale.set(
          visual.baseFlameWidth * flicker,
          visual.baseFlameHeight * (0.9 + flicker * 0.2),
          1
        );
        visual.flame.material.opacity = 0.68 + Math.sin(time * 10 + visual.seed) * 0.18;
        visual.flame.position.copy(visual.baseFlamePosition);
        visual.flame.position.y += yOffset;
        visual.flame.lookAt(this.camera.position);
      }

      if (visual.glow && visual.baseGlowPosition) {
        const glowPulse = 0.94 + Math.sin(time * 5 + visual.seed) * 0.06;
        visual.glow.scale.set(visual.baseGlowWidth * glowPulse, visual.baseGlowHeight * glowPulse, 1);
        visual.glow.material.opacity = 0.18 + Math.sin(time * 5 + visual.seed) * 0.1;
        visual.glow.position.copy(visual.baseGlowPosition);
        visual.glow.position.y += yOffset * 0.25;
        visual.glow.lookAt(this.camera.position);
      }

      if (visual.light) {
        visual.light.intensity = visual.baseIntensity * (0.75 + Math.random() * 0.45);
      }
    });
  }

  private addFlame(visual: LampVisual): void {
    const basePosition = visual.marker.position.clone();
    const towardCamera = basePosition.clone().normalize().multiplyScalar(-4);
    const flamePosition = basePosition.clone().add(towardCamera);
    const glowPosition = basePosition.clone().add(towardCamera.clone().multiplyScalar(0.85));
    visual.baseFlamePosition = flamePosition.clone();
    visual.baseGlowPosition = glowPosition.clone();

    const flameMaterial = new THREE.SpriteMaterial({
      map: this.flameTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const flame = new THREE.Sprite(flameMaterial);
    flame.name = `litFlame-${visual.config.id}`;
    flame.position.copy(flamePosition);
    flame.scale.set(visual.baseFlameWidth, visual.baseFlameHeight, 1);
    flame.renderOrder = 100;
    flame.frustumCulled = false;
    flame.userData = { type: "lamp", id: visual.config.id, label: visual.config.label };

    const glowMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture,
      transparent: true,
      opacity: isMainLamp(visual.config) ? 0.28 : 0.22,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.name = `lampGlow-${visual.config.id}`;
    glow.position.copy(glowPosition);
    glow.scale.set(visual.baseGlowWidth, visual.baseGlowHeight, 1);
    glow.renderOrder = 98;
    glow.frustumCulled = false;
    glow.userData = { type: "decor", id: `${visual.config.id}-glow` };
    glow.raycast = () => undefined;

    const distance = isMainLamp(visual.config) ? 62 : 42;
    const light = new THREE.PointLight(0xffb84a, visual.baseIntensity, distance, 2);
    light.name = `lampPointLight-${visual.config.id}`;
    light.position.copy(flamePosition).multiplyScalar(0.96);

    this.scene.add(glow, flame, light);
    this.clickable.push(flame);
    visual.flame = flame;
    visual.glow = glow;
    visual.light = light;
  }

  private createDebugLabel(config: HotspotConfig): THREE.Sprite {
    const texture = makeLabelTexture(config.id);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const label = new THREE.Sprite(material);
    label.name = `lampDebugLabel-${config.id}`;
  label.position.copy(lampPosition(config, this.radius - 7, this.yawOffsetDeg));
    label.position.y += 11;
    label.scale.set(74, 18, 1);
    label.renderOrder = 120;
    label.frustumCulled = false;
    label.raycast = () => undefined;
    label.userData = { type: "decor", kind: "lamp-debug-label" };
    return label;
  }
}
