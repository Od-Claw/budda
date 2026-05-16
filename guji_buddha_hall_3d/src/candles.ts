import * as THREE from "three";
import { HotspotConfig, lonLatToVector3, makeHotspotTexture } from "./hotspots";
import { LampRecord } from "./storage";

export interface CandleManagerOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  radius?: number;
  debug?: boolean;
  yawOffsetDeg?: number;
}

interface SparkVisual {
  sprite: THREE.Sprite;
  seed: number;
  height: number;
  drift: number;
  speed: number;
  baseScale: number;
}

interface CandleVisual {
  id: string;
  config: HotspotConfig;
  marker: THREE.Sprite;
  clickTarget: THREE.Sprite;
  group?: THREE.Group;
  flame?: THREE.Sprite;
  flameTexture?: THREE.Texture;
  glow?: THREE.Sprite;
  sparks: SparkVisual[];
  light?: THREE.PointLight;
  label?: THREE.Sprite;
  record?: LampRecord;
  seed: number;
  baseLightIntensity: number;
  baseLightDistance: number;
  targetFlamePixels: number;
  targetGlowPixels: number;
  size: "wall" | "main" | "altar";
}

const FLAME_SHEET_URL = `${import.meta.env.BASE_URL}assets/buddha_candle_flame_spritesheet_12x256.png`;
const GLOW_URL = `${import.meta.env.BASE_URL}assets/buddha_candle_gold_glow_256.png`;
const FLAME_FRAME_COUNT = 12;

function getFlameScaleMultiplier(): number {
  const params = new URLSearchParams(window.location.search);
  const value = Number(params.get("flameScale") ?? "1");
  if (!Number.isFinite(value)) return 1;
  return THREE.MathUtils.clamp(value, 0.35, 1.8);
}

function worldHeightForScreenPixels(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  worldPosition: THREE.Vector3,
  targetPixels: number
): number {
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    return targetPixels * 0.1;
  }

  const distance = camera.position.distanceTo(worldPosition);
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const viewportHeight = renderer.domElement.clientHeight || window.innerHeight || 1;

  return 2 * distance * Math.tan(fovRad / 2) * (targetPixels / viewportHeight);
}

function getLampSize(config: HotspotConfig): "wall" | "main" | "altar" {
  if (config.size === "main" || config.size === "altar" || config.size === "wall") return config.size;
  if (config.id.startsWith("main-")) return "main";
  if (config.id.startsWith("altar-")) return "altar";
  return "wall";
}

function createFlameFrameTexture(baseTexture: THREE.Texture): THREE.Texture {
  const texture = baseTexture.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / FLAME_FRAME_COUNT, 1);
  texture.offset.set(0, 0);
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

function makeSparkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const glow = ctx.createRadialGradient(48, 48, 1, 48, 48, 42);
  glow.addColorStop(0, "rgba(255, 255, 220, 1)");
  glow.addColorStop(0.24, "rgba(255, 216, 96, 0.78)");
  glow.addColorStop(0.72, "rgba(255, 140, 36, 0.22)");
  glow.addColorStop(1, "rgba(255, 140, 36, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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
  const visualLon = config.lon + (config.visualLonOffset ?? 0) + yawOffsetDeg;
  const visualLat = config.lat + (config.visualLatOffset ?? 0);
  return lonLatToVector3(visualLon, visualLat, radius);
}

function candlePosition(config: HotspotConfig, radius: number, yawOffsetDeg: number): THREE.Vector3 {
  const base = lampPosition(config, radius, yawOffsetDeg);
  const size = getLampSize(config);
  const inwardAmount = size === "main" ? -20 : size === "altar" ? -12 : -16;
  const inward = base.clone().normalize().multiplyScalar(inwardAmount);
  return base.add(inward);
}

export class CandleManager {
  readonly clickable: THREE.Object3D[] = [];
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private radius: number;
  private debug: boolean;
  private yawOffsetDeg: number;
  private visuals = new Map<string, CandleVisual>();
  private unlitTexture = makeHotspotTexture("lamp");
  private litTexture = makeHotspotTexture("lampLit");
  private flameSheetTexture: THREE.Texture;
  private glowTexture: THREE.Texture;
  private sparkTexture = makeSparkTexture();
  private clickTargetTexture = makeClickTargetTexture();

  constructor(options: CandleManagerOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.radius = options.radius ?? 488;
    this.debug = options.debug ?? false;
    this.yawOffsetDeg = options.yawOffsetDeg ?? 0;

    const loader = new THREE.TextureLoader();
    this.flameSheetTexture = loader.load(
      FLAME_SHEET_URL,
      undefined,
      undefined,
      (error) => console.error("[candles] flame spritesheet failed", FLAME_SHEET_URL, error)
    );
    this.flameSheetTexture.colorSpace = THREE.SRGBColorSpace;
    this.flameSheetTexture.wrapS = THREE.RepeatWrapping;
    this.flameSheetTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.flameSheetTexture.repeat.set(1 / FLAME_FRAME_COUNT, 1);
    this.flameSheetTexture.needsUpdate = true;

    this.glowTexture = loader.load(
      GLOW_URL,
      undefined,
      undefined,
      (error) => console.error("[candles] glow texture failed", GLOW_URL, error)
    );
    this.glowTexture.colorSpace = THREE.SRGBColorSpace;
    this.glowTexture.needsUpdate = true;
  }

  create(hotspots: HotspotConfig[], records: LampRecord[]): void {
    if (this.debug) {
      console.table(hotspots.map(({ id, label, lon, lat, size }) => ({ id, label, lon, lat, size: size ?? "wall" })));
    }

    const recordMap = new Map(records.map((record) => [record.id, record]));

    hotspots.forEach((config) => {
      const size = getLampSize(config);
      const main = size === "main";
      const altar = size === "altar";
      const markerBase = main ? 15 : altar ? 12 : 11;
      const clickBase = main ? 30 : altar ? 27 : 24;
      const markerMaterial = new THREE.SpriteMaterial({
        map: recordMap.has(config.id) ? this.litTexture : this.unlitTexture,
        transparent: true,
        opacity: recordMap.has(config.id) ? 0.08 : 0.82,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const marker = new THREE.Sprite(markerMaterial);
      marker.name = `lampMarker-${config.id}`;
      marker.position.copy(candlePosition(config, this.radius, this.yawOffsetDeg));
      marker.scale.set(markerBase, markerBase, 1);
      marker.renderOrder = 90;
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
      clickTarget.position.copy(marker.position);
      clickTarget.scale.set(clickBase, clickBase, 1);
      clickTarget.renderOrder = 120;
      clickTarget.frustumCulled = false;
      clickTarget.userData = { type: "lamp", id: config.id, label: config.label };
      this.scene.add(clickTarget);
      this.clickable.push(clickTarget);

      const visual: CandleVisual = {
        id: config.id,
        config,
        marker,
        clickTarget,
        record: recordMap.get(config.id),
        seed: Math.random() * Math.PI * 2,
        baseLightIntensity: main ? 2.8 : altar ? 1.0 : 1.8,
        baseLightDistance: main ? 95 : altar ? 42 : 65,
        targetFlamePixels: (main ? 64 : altar ? 32 : 46) * getFlameScaleMultiplier(),
        targetGlowPixels: (main ? 125 : altar ? 62 : 88) * getFlameScaleMultiplier(),
        sparks: [],
        size
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
    markerMaterial.opacity = 0.08;
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
      markerMaterial.opacity = 0.82;
      markerMaterial.needsUpdate = true;
      if (visual.group) this.scene.remove(visual.group);
      visual.group = undefined;
      visual.flame = undefined;
      visual.flameTexture = undefined;
      visual.glow = undefined;
      visual.light = undefined;
      visual.sparks = [];
    });
  }

  update(time: number): void {
    this.visuals.forEach((visual) => {
      visual.marker.lookAt(this.camera.position);
      visual.clickTarget.lookAt(this.camera.position);
      if (visual.label) visual.label.lookAt(this.camera.position);

      if (!visual.record) {
        const pulse = 1 + Math.sin(time * 2.2 + visual.seed) * 0.09;
        const base = visual.size === "main" ? 15 : visual.size === "altar" ? 12 : 11;
        visual.marker.scale.setScalar(base * pulse);
        const markerMaterial = visual.marker.material as THREE.SpriteMaterial;
        markerMaterial.opacity = 0.64 + Math.sin(time * 2.2 + visual.seed) * 0.12;
        return;
      }

      const markerMaterial = visual.marker.material as THREE.SpriteMaterial;
      markerMaterial.opacity = 0.055 + Math.sin(time * 3 + visual.seed) * 0.025;
      visual.marker.scale.setScalar(visual.size === "main" ? 8 : visual.size === "altar" ? 5 : 6);

      if (!visual.group || !visual.flame || !visual.flameTexture || !visual.glow || !visual.light) return;

      const fps = 10 + Math.sin(visual.seed) * 2;
      const frameIndex = Math.floor((time * fps + visual.seed * 3) % FLAME_FRAME_COUNT);
      visual.flameTexture.offset.x = frameIndex / FLAME_FRAME_COUNT;

      const flicker =
        0.92 +
        Math.sin(time * 8.0 + visual.seed) * 0.1 +
        Math.sin(time * 17.0 + visual.seed * 1.7) * 0.045;

      const worldPos = new THREE.Vector3();
      visual.group.getWorldPosition(worldPos);
      const flameHeight = worldHeightForScreenPixels(
        this.camera,
        this.renderer,
        worldPos,
        visual.targetFlamePixels
      );
      const flameWidthRatio = visual.size === "main" ? 0.36 : 0.34;
      const flameWidth = flameHeight * flameWidthRatio;
      const glowHeight = worldHeightForScreenPixels(this.camera, this.renderer, worldPos, visual.targetGlowPixels);
      const maxFlameHeightPixels = visual.size === "main" ? 82 : visual.size === "altar" ? 42 : 58;
      const maxFlameHeight = worldHeightForScreenPixels(this.camera, this.renderer, worldPos, maxFlameHeightPixels);
      const finalFlameHeight = Math.min(flameHeight * (0.92 + flicker * 0.16), maxFlameHeight);

      visual.flame.scale.set(
        flameWidth * flicker,
        finalFlameHeight,
        1
      );

      const flameMat = visual.flame.material as THREE.SpriteMaterial;
      flameMat.opacity =
        0.84 +
        Math.sin(time * 10.0 + visual.seed) * 0.12 +
        Math.sin(time * 23.0 + visual.seed) * 0.05;

      visual.flame.position.x = Math.sin(time * 5.0 + visual.seed) * flameWidth * 0.018;
      visual.flame.position.y =
        Math.sin(time * 6.2 + visual.seed) * finalFlameHeight * 0.018 -
        (visual.size === "wall" ? finalFlameHeight * 0.1 : visual.size === "altar" ? finalFlameHeight * 0.08 : 0);
      visual.flame.lookAt(this.camera.position);

      const glowMat = visual.glow.material as THREE.SpriteMaterial;
      const glowOpacityBase = visual.size === "main" ? 0.26 : visual.size === "altar" ? 0.16 : 0.22;
      const glowOpacityPulse = visual.size === "main" ? 0.08 : visual.size === "altar" ? 0.05 : 0.07;
      glowMat.opacity =
        glowOpacityBase +
        Math.sin(time * 4.5 + visual.seed) * glowOpacityPulse +
        Math.sin(time * 9.0 + visual.seed) * glowOpacityPulse * 0.5;

      const glowScale = glowHeight * (0.92 + Math.sin(time * 5.5 + visual.seed) * 0.08);
      visual.glow.scale.set(glowScale, glowScale, 1);
      visual.glow.lookAt(this.camera.position);

      visual.light.intensity = visual.baseLightIntensity * (0.75 + Math.random() * 0.45);

      visual.sparks.forEach((spark, index) => {
        const phase = (time * spark.speed + spark.seed) % 1;
        const angle = spark.seed + phase * Math.PI * 2;
        spark.sprite.position.set(
          Math.sin(angle) * spark.drift * flameWidth * 0.22,
          -flameHeight * 0.18 + phase * spark.height * flameHeight * 0.22,
          Math.cos(angle * 0.7) * spark.drift * flameWidth * 0.08
        );
        const sparkMat = spark.sprite.material as THREE.SpriteMaterial;
        sparkMat.opacity = (1 - phase) * (0.35 + Math.sin(time * 8 + index) * 0.18);
        const scale = spark.baseScale * flameHeight * 0.04 * (0.75 + (1 - phase) * 0.35);
        spark.sprite.scale.set(scale, scale, 1);
        spark.sprite.lookAt(this.camera.position);
      });
    });
  }

  private addFlame(visual: CandleVisual): void {
    const group = new THREE.Group();
    group.name = `candleVisual-${visual.config.id}`;
    group.position.copy(candlePosition(visual.config, this.radius, this.yawOffsetDeg));
    group.renderOrder = 100;
    this.scene.add(group);

    const flameTexture = createFlameFrameTexture(this.flameSheetTexture);
    const flameMaterial = new THREE.SpriteMaterial({
      map: flameTexture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const flame = new THREE.Sprite(flameMaterial);
    flame.name = `litFlame-${visual.config.id}`;
    flame.scale.set(1, 1, 1);
    flame.renderOrder = 110;
    flame.frustumCulled = false;
    flame.userData = { type: "decor", id: `${visual.config.id}-flame` };
    flame.raycast = () => undefined;
    group.add(flame);

    const glowMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.name = `lampGlow-${visual.config.id}`;
    glow.position.set(0, 0, -0.02);
    glow.scale.set(1, 1, 1);
    glow.renderOrder = 100;
    glow.frustumCulled = false;
    glow.userData = { type: "decor", id: `${visual.config.id}-glow` };
    glow.raycast = () => undefined;
    group.add(glow);

    const sparkCount = visual.size === "main" ? 7 : visual.size === "altar" ? 4 : 5;
    const sparks: SparkVisual[] = [];
    for (let index = 0; index < sparkCount; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: this.sparkTexture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.name = `candleSpark-${visual.config.id}-${index}`;
      sprite.renderOrder = 112;
      sprite.frustumCulled = false;
      sprite.userData = { type: "decor", kind: "spark" };
      sprite.raycast = () => undefined;
      group.add(sprite);
      sparks.push({
        sprite,
        seed: Math.random() * 99,
        height: visual.size === "main" ? 8.5 : visual.size === "altar" ? 4.6 : 6.2,
        drift: visual.size === "main" ? 1.25 : visual.size === "altar" ? 0.62 : 0.85,
        speed: 0.28 + Math.random() * 0.18,
        baseScale: 1.2 + Math.random() * 1.2
      });
    }

    const light = new THREE.PointLight(0xffb84a, visual.baseLightIntensity, visual.baseLightDistance, 2);
    light.name = `lampPointLight-${visual.config.id}`;
    group.add(light);

    visual.group = group;
    visual.flame = flame;
    visual.flameTexture = flameTexture;
    visual.glow = glow;
    visual.sparks = sparks;
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
    label.position.copy(candlePosition(config, this.radius, this.yawOffsetDeg));
    label.position.y += 11;
    label.scale.set(74, 18, 1);
    label.renderOrder = 130;
    label.frustumCulled = false;
    label.raycast = () => undefined;
    label.userData = { type: "decor", kind: "lamp-debug-label" };
    return label;
  }
}
