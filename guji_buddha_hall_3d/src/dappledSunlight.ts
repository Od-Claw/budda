import * as THREE from "three";

type DappleOptions = {
  strength?: number;
  shadowStrength?: number;
  glowStrength?: number;
  groundStrength?: number;
  motion?: number;
  enabled?: boolean;
  debug?: boolean;
};

type LeafBlob = {
  x: number;
  y: number;
  size: number;
  angle: number;
  speed: number;
  phase: number;
  opacity: number;
  stretch: number;
  swayX: number;
  swayY: number;
  shape: "ellipse" | "leaf" | "twig";
};

type GroundSpot = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  speed: number;
  blinkSpeed: number;
  phase: number;
  opacity: number;
  driftX: number;
  driftY: number;
  tint: string;
};

type BeamSprite = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  basePosition: THREE.Vector3;
  phase: number;
  speed: number;
  drift: number;
  baseOpacity: number;
};

type DynamicTextureSpot = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  phase: number;
  speed: number;
  blinkSpeed: number;
  opacity: number;
  driftX: number;
  driftY: number;
  tint: string;
};

export type DappledSunlightSystem = {
  overlayCanvas: HTMLCanvasElement;
  glowCanvas: HTMLCanvasElement;
  groundDappleCanvas: HTMLCanvasElement;
  update: (elapsed: number) => void;
  resize: () => void;
  destroy: () => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function replaceAlpha(color: string, alpha: number): string {
  return color.replace(/[\d.]+\)\s*$/, `${clamp(alpha, 0, 1)})`);
}

function createOverlayCanvas(className: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = 1024;
  canvas.height = 576;
  return canvas;
}

function createCanvasTexture(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
} {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { canvas, ctx, texture };
}

function buildLeaves(width: number, height: number): LeafBlob[] {
  const random = createSeededRandom(0x41c64e6d);
  const leaves: LeafBlob[] = [];

  for (let index = 0; index < 180; index += 1) {
    const lowerHalf = index >= 120;
    const x = random() * width;
    const y = lowerHalf
      ? height * (0.48 + random() * 0.46)
      : height * Math.pow(random(), 1.7) * 0.64;
    const size = lowerHalf ? 18 + random() * 72 : 10 + random() * 42;
    const shapeRoll = random();
    leaves.push({
      x,
      y,
      size,
      angle: random() * Math.PI * 2,
      speed: 0.045 + random() * 0.14,
      phase: random() * Math.PI * 2,
      opacity: lowerHalf ? 0.08 + random() * 0.1 : 0.05 + random() * 0.08,
      stretch: 0.65 + random() * 1.5,
      swayX: lowerHalf ? 10 + random() * 22 : 4 + random() * 12,
      swayY: lowerHalf ? 6 + random() * 14 : 2 + random() * 8,
      shape: shapeRoll < 0.38 ? "ellipse" : shapeRoll < 0.82 ? "leaf" : "twig"
    });
  }

  return leaves;
}

function buildUpperGlowSpots(width: number, height: number): GroundSpot[] {
  const random = createSeededRandom(0x9e3779b9);
  const colors = [
    "rgba(255, 220, 135, 0.16)",
    "rgba(255, 190, 80, 0.10)",
    "rgba(255, 245, 190, 0.08)"
  ];
  const spots: GroundSpot[] = [];

  for (let index = 0; index < 22; index += 1) {
    spots.push({
      x: width * (0.18 + random() * 0.66),
      y: height * (0.08 + random() * 0.44),
      radiusX: 34 + random() * 100,
      radiusY: 20 + random() * 64,
      rotation: random() * Math.PI,
      speed: 0.06 + random() * 0.12,
      blinkSpeed: 0.18 + random() * 0.18,
      phase: random() * Math.PI * 2,
      opacity: 0.06 + random() * 0.08,
      driftX: 8 + random() * 18,
      driftY: 4 + random() * 10,
      tint: colors[index % colors.length]
    });
  }

  return spots;
}

function buildGroundSpots(width: number, height: number, seed = 0x13572468): GroundSpot[] {
  const random = createSeededRandom(seed);
  const colors = [
    "rgba(255, 220, 120, 0.12)",
    "rgba(255, 190, 70, 0.10)",
    "rgba(255, 245, 190, 0.08)"
  ];
  const spots: GroundSpot[] = [];

  for (let index = 0; index < 60; index += 1) {
    spots.push({
      x: width * (0.08 + random() * 0.84),
      y: height * (0.46 + random() * 0.44),
      radiusX: 34 + random() * 118,
      radiusY: 22 + random() * 76,
      rotation: random() * Math.PI,
      speed: 0.1 + random() * 0.18,
      blinkSpeed: 0.32 + random() * 0.44,
      phase: random() * Math.PI * 2,
      opacity: 0.11 + random() * 0.1,
      driftX: 18 + random() * 28,
      driftY: 8 + random() * 16,
      tint: colors[index % colors.length]
    });
  }

  return spots;
}

function buildPlaneSpots(width: number, height: number): DynamicTextureSpot[] {
  const random = createSeededRandom(0x24681357);
  const colors = [
    "rgba(255, 230, 152, 0.16)",
    "rgba(255, 196, 95, 0.12)",
    "rgba(255, 247, 198, 0.10)"
  ];
  const spots: DynamicTextureSpot[] = [];

  for (let index = 0; index < 40; index += 1) {
    spots.push({
      x: width * (0.04 + random() * 0.92),
      y: height * (0.1 + random() * 0.82),
      radiusX: 26 + random() * 124,
      radiusY: 16 + random() * 58,
      rotation: random() * Math.PI,
      phase: random() * Math.PI * 2,
      speed: 0.1 + random() * 0.16,
      blinkSpeed: 0.4 + random() * 0.42,
      opacity: 0.12 + random() * 0.1,
      driftX: 20 + random() * 28,
      driftY: 10 + random() * 16,
      tint: colors[index % colors.length]
    });
  }

  return spots;
}

function drawLeafShape(ctx: CanvasRenderingContext2D, leaf: LeafBlob, x: number, y: number, rotation: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  if (leaf.shape === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size * 0.6, leaf.size * 0.24 * leaf.stretch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (leaf.shape === "leaf") {
    const width = leaf.size * 0.4;
    const height = leaf.size * 0.92 * leaf.stretch;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.55);
    ctx.quadraticCurveTo(width, -height * 0.1, width * 0.42, height * 0.54);
    ctx.quadraticCurveTo(0, height * 0.84, -width * 0.42, height * 0.54);
    ctx.quadraticCurveTo(-width, -height * 0.1, 0, -height * 0.55);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.lineCap = "round";
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1, leaf.size * 0.14);
  ctx.beginPath();
  ctx.moveTo(-leaf.size * 0.48, -leaf.size * 0.18);
  ctx.quadraticCurveTo(-leaf.size * 0.16, -leaf.size * 0.72, 0, 0);
  ctx.quadraticCurveTo(leaf.size * 0.1, leaf.size * 0.68, leaf.size * 0.44, leaf.size * 0.18);
  ctx.stroke();
  ctx.restore();
}

function drawSoftEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  color: string,
  alpha = 1
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(radiusX, radiusY);

  const gradient = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1);
  gradient.addColorStop(0, replaceAlpha(color, 0.88 * alpha));
  gradient.addColorStop(0.45, replaceAlpha(color, 0.4 * alpha));
  gradient.addColorStop(1, replaceAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGroundSpot(ctx: CanvasRenderingContext2D, spot: GroundSpot | DynamicTextureSpot, x: number, y: number, opacity: number): void {
  drawSoftEllipse(ctx, x, y, spot.radiusX, spot.radiusY, spot.rotation, spot.tint, opacity);
  drawSoftEllipse(ctx, x + spot.radiusX * 0.22, y - spot.radiusY * 0.08, spot.radiusX * 0.54, spot.radiusY * 0.74, spot.rotation + 0.46, spot.tint, opacity * 0.8);
  drawSoftEllipse(ctx, x - spot.radiusX * 0.18, y + spot.radiusY * 0.12, spot.radiusX * 0.42, spot.radiusY * 0.56, spot.rotation - 0.35, "rgba(255, 248, 214, 0.08)", opacity * 0.62);
}

function createSunbeamTexture(): THREE.CanvasTexture {
  const { canvas, ctx, texture } = createCanvasTexture(192, 768);

  const beam = ctx.createLinearGradient(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
  beam.addColorStop(0, "rgba(255, 245, 214, 0)");
  beam.addColorStop(0.1, "rgba(255, 236, 184, 0.22)");
  beam.addColorStop(0.36, "rgba(255, 214, 128, 0.14)");
  beam.addColorStop(0.8, "rgba(255, 190, 88, 0.04)");
  beam.addColorStop(1, "rgba(255, 190, 88, 0)");

  const core = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.15,
    canvas.width * 0.02,
    canvas.width * 0.5,
    canvas.height * 0.34,
    canvas.width * 0.34
  );
  core.addColorStop(0, "rgba(255, 249, 226, 0.42)");
  core.addColorStop(0.32, "rgba(255, 220, 145, 0.14)");
  core.addColorStop(1, "rgba(255, 220, 145, 0)");

  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.36, 0);
  ctx.lineTo(canvas.width * 0.64, 0);
  ctx.lineTo(canvas.width * 0.76, canvas.height);
  ctx.lineTo(canvas.width * 0.24, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = core;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  texture.needsUpdate = true;
  return texture;
}

export function createDappledSunlight(options: DappleOptions = {}): DappledSunlightSystem {
  const appRoot = document.getElementById("app") ?? document.body;
  const overlayCanvas = createOverlayCanvas("dapple-shadow-overlay");
  const glowCanvas = createOverlayCanvas("dapple-glow-overlay");
  const groundDappleCanvas = createOverlayCanvas("ground-dapple-overlay");

  const overlayContext = overlayCanvas.getContext("2d");
  const glowContext = glowCanvas.getContext("2d");
  const groundContext = groundDappleCanvas.getContext("2d");

  if (!overlayContext || !glowContext || !groundContext) {
    throw new Error("Canvas 2D context unavailable for dappled sunlight overlays");
  }
  const overlayCtx = overlayContext;
  const glowCtx = glowContext;
  const groundCtx = groundContext;

  const strength = clamp(options.strength ?? 1, 0, 2.4);
  const shadowStrength = clamp(options.shadowStrength ?? 1, 0, 2.4);
  const glowStrength = clamp(options.glowStrength ?? 1, 0, 2.4);
  const groundStrength = clamp(options.groundStrength ?? 1, 0, 2.5);
  const motion = clamp(options.motion ?? 1, 0, 2.4);
  const enabled = options.enabled ?? true;
  const debug = options.debug ?? false;

  const width = 1024;
  const height = 576;
  const leaves = buildLeaves(width, height);
  const upperGlowSpots = buildUpperGlowSpots(width, height);
  const groundSpots = buildGroundSpots(width, height);
  const groundDappleEnabled = groundStrength > 0;
  let frameCount = 0;
  let lastRenderedAt = -Infinity;
  let lastDebugLogAt = -Infinity;
  let lastUpdateTime = 0;

  function getOverlayCount(): number {
    return groundDappleEnabled ? 3 : 2;
  }

  function appendOverlays(): void {
    appRoot.appendChild(overlayCanvas);
    appRoot.appendChild(glowCanvas);
    appRoot.appendChild(groundDappleCanvas);
  }

  function applyStyles(): void {
    const all = [overlayCanvas, glowCanvas, groundDappleCanvas];
    for (const canvas of all) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      canvas.style.display = enabled ? "block" : "none";
    }
    groundDappleCanvas.style.display = enabled && groundDappleEnabled ? "block" : "none";
    overlayCanvas.style.opacity = String(clamp(0.22 * strength * shadowStrength, 0, 0.42));
    glowCanvas.style.opacity = String(clamp(0.16 * strength * glowStrength, 0, 0.28));
    groundDappleCanvas.style.opacity = String(clamp(0.3 * strength * groundStrength, 0, 0.44));
  }

  function resize(): void {
    applyStyles();
    if (debug) {
      console.info("[sunDapple] resize", {
        overlayCount: getOverlayCount(),
        leafCount: leaves.length,
        groundSpotCount: groundSpots.length,
        frameCount,
        lastUpdateTime
      });
    }
  }

  function renderShadowLayer(elapsed: number): void {
    overlayCtx.clearRect(0, 0, width, height);
    const globalDriftX = Math.sin(elapsed * 0.18 * motion) * 24;
    const globalDriftY = Math.cos(elapsed * 0.12 * motion) * 14;

    const canopyGradient = overlayCtx.createLinearGradient(0, 0, 0, height * 0.72);
    canopyGradient.addColorStop(0, "rgba(6, 12, 4, 0.12)");
    canopyGradient.addColorStop(0.2, "rgba(12, 18, 7, 0.08)");
    canopyGradient.addColorStop(0.56, "rgba(0, 0, 0, 0.02)");
    canopyGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    overlayCtx.fillStyle = canopyGradient;
    overlayCtx.fillRect(0, 0, width, height);

    for (let index = 0; index < leaves.length; index += 1) {
      const leaf = leaves[index];
      const lowerHalf = leaf.y > height * 0.45;
      const swayX = Math.sin(elapsed * leaf.speed * motion + leaf.phase) * leaf.swayX;
      const swayY = Math.cos(elapsed * leaf.speed * 0.7 * motion + leaf.phase) * leaf.swayY;
      const x = leaf.x + swayX + (lowerHalf ? globalDriftX : globalDriftX * 0.25);
      const y = leaf.y + swayY + (lowerHalf ? globalDriftY : globalDriftY * 0.18);
      const angle = leaf.angle + Math.sin(elapsed * leaf.speed * 0.35 * motion + leaf.phase) * (lowerHalf ? 0.12 : 0.06);
      const alphaBoost = lowerHalf ? 1.42 : 0.66;
      overlayCtx.fillStyle =
        lowerHalf
          ? index % 2 === 0
            ? `rgba(4, 10, 3, ${leaf.opacity * alphaBoost})`
            : `rgba(0, 0, 0, ${leaf.opacity * 0.72 * alphaBoost})`
          : index % 2 === 0
            ? `rgba(8, 16, 6, ${leaf.opacity * alphaBoost})`
            : `rgba(24, 32, 10, ${leaf.opacity * 0.82 * alphaBoost})`;
      drawLeafShape(overlayCtx, leaf, x, y, angle);
    }
  }

  function renderGlowLayer(elapsed: number): void {
    glowCtx.clearRect(0, 0, width, height);

    const topGlow = glowCtx.createRadialGradient(
      width * 0.48,
      height * 0.08,
      width * 0.06,
      width * 0.48,
      height * 0.08,
      width * 0.52
    );
    topGlow.addColorStop(0, "rgba(255, 241, 198, 0.22)");
    topGlow.addColorStop(0.34, "rgba(255, 214, 120, 0.12)");
    topGlow.addColorStop(1, "rgba(255, 214, 120, 0)");
    glowCtx.fillStyle = topGlow;
    glowCtx.fillRect(0, 0, width, height);

    const backlight = glowCtx.createRadialGradient(width * 0.5, height * 0.33, 0, width * 0.5, height * 0.33, width * 0.22);
    backlight.addColorStop(0, "rgba(255, 229, 162, 0.12)");
    backlight.addColorStop(0.56, "rgba(255, 196, 102, 0.05)");
    backlight.addColorStop(1, "rgba(255, 196, 102, 0)");
    glowCtx.fillStyle = backlight;
    glowCtx.fillRect(0, 0, width, height);

    const leftBeam = glowCtx.createLinearGradient(width * 0.18, 0, width * 0.48, height * 0.84);
    leftBeam.addColorStop(0, "rgba(255, 242, 205, 0.18)");
    leftBeam.addColorStop(0.18, "rgba(255, 218, 132, 0.09)");
    leftBeam.addColorStop(0.72, "rgba(255, 200, 102, 0.02)");
    leftBeam.addColorStop(1, "rgba(255, 200, 102, 0)");
    glowCtx.fillStyle = leftBeam;
    glowCtx.beginPath();
    glowCtx.moveTo(width * 0.12, 0);
    glowCtx.lineTo(width * 0.28, 0);
    glowCtx.lineTo(width * 0.6, height * 0.82);
    glowCtx.lineTo(width * 0.42, height * 0.82);
    glowCtx.closePath();
    glowCtx.fill();

    const rightBeam = glowCtx.createLinearGradient(width * 0.74, 0, width * 0.92, height * 0.74);
    rightBeam.addColorStop(0, "rgba(255, 243, 215, 0.14)");
    rightBeam.addColorStop(0.22, "rgba(255, 214, 126, 0.07)");
    rightBeam.addColorStop(1, "rgba(255, 214, 126, 0)");
    glowCtx.fillStyle = rightBeam;
    glowCtx.beginPath();
    glowCtx.moveTo(width * 0.7, 0);
    glowCtx.lineTo(width * 0.8, 0);
    glowCtx.lineTo(width * 0.98, height * 0.72);
    glowCtx.lineTo(width * 0.9, height * 0.72);
    glowCtx.closePath();
    glowCtx.fill();

    for (const spot of upperGlowSpots) {
      const x = spot.x + Math.sin(elapsed * spot.speed * motion + spot.phase) * spot.driftX;
      const y = spot.y + Math.cos(elapsed * spot.speed * 0.7 * motion + spot.phase) * spot.driftY;
      const pulse = spot.opacity * (0.72 + Math.sin(elapsed * spot.blinkSpeed * motion + spot.phase) * 0.22);
      drawGroundSpot(glowCtx, spot, x, y, pulse);
    }
  }

  function renderGroundLayer(elapsed: number): void {
    groundCtx.clearRect(0, 0, width, height);
    const lowerStart = height * 0.42;

    groundCtx.save();
    groundCtx.beginPath();
    groundCtx.rect(0, lowerStart, width, height - lowerStart);
    groundCtx.clip();

    const floorBand = groundCtx.createLinearGradient(0, lowerStart, 0, height);
    floorBand.addColorStop(0, "rgba(255, 220, 140, 0)");
    floorBand.addColorStop(0.34, "rgba(255, 220, 140, 0.06)");
    floorBand.addColorStop(1, "rgba(255, 220, 140, 0.12)");
    groundCtx.fillStyle = floorBand;
    groundCtx.fillRect(0, lowerStart, width, height - lowerStart);

    const sweepX = width * 0.48 + Math.sin(elapsed * 0.11 * motion) * width * 0.12;
    const sweepY = height * 0.76 + Math.cos(elapsed * 0.08 * motion) * height * 0.04;
    const sweep = groundCtx.createRadialGradient(sweepX, sweepY, width * 0.05, sweepX, sweepY, width * 0.28);
    sweep.addColorStop(0, "rgba(255, 232, 160, 0.12)");
    sweep.addColorStop(0.32, "rgba(255, 210, 122, 0.08)");
    sweep.addColorStop(1, "rgba(255, 210, 122, 0)");
    groundCtx.fillStyle = sweep;
    groundCtx.fillRect(0, lowerStart, width, height - lowerStart);

    for (const spot of groundSpots) {
      const x = spot.x + Math.sin(elapsed * spot.speed * motion + spot.phase) * 30;
      const y = spot.y + Math.cos(elapsed * spot.speed * 0.7 * motion + spot.phase) * 16;
      const opacity = spot.opacity * (0.7 + Math.sin(elapsed * spot.blinkSpeed * motion + spot.phase) * 0.34);
      drawGroundSpot(groundCtx, spot, x, y, opacity);
      if (spot.radiusX > 90) {
        drawGroundSpot(
          groundCtx,
          spot,
          x + Math.sin(elapsed * spot.speed * 0.5 * motion + spot.phase) * 12,
          y - Math.cos(elapsed * spot.speed * 0.45 * motion + spot.phase) * 8,
          opacity * 0.66
        );
      }
    }

    groundCtx.restore();
  }

  function update(elapsed: number): void {
    if (!enabled) return;
    if (elapsed - lastRenderedAt < 1 / 30) return;

    lastRenderedAt = elapsed;
    lastUpdateTime = elapsed;
    frameCount += 1;

    renderShadowLayer(elapsed);
    renderGlowLayer(elapsed);
    if (groundStrength > 0) {
      renderGroundLayer(elapsed);
    } else {
      groundCtx.clearRect(0, 0, width, height);
    }

    if (debug && elapsed - lastDebugLogAt > 2) {
      lastDebugLogAt = elapsed;
      console.info("[sunDapple] active", {
        overlayCount: getOverlayCount(),
        leafCount: leaves.length,
        groundSpotCount: groundSpots.length,
        frameCount,
        lastUpdateTime
      });
    }
  }

  function destroy(): void {
    overlayCanvas.remove();
    glowCanvas.remove();
    groundDappleCanvas.remove();
  }

  appendOverlays();
  resize();
  update(0);

  if (debug) {
    console.info("[sunDapple] created", {
      overlayCount: getOverlayCount(),
      leafCount: leaves.length,
      groundSpotCount: groundSpots.length,
      frameCount,
      lastUpdateTime
    });
  }

  return {
    overlayCanvas,
    glowCanvas,
    groundDappleCanvas,
    update,
    resize,
    destroy
  };
}

export function createSunbeamSprites(scene: THREE.Scene): {
  group: THREE.Group;
  update: (elapsed: number) => void;
  destroy: () => void;
} {
  const texture = createSunbeamTexture();
  const group = new THREE.Group();
  group.name = "dappledSunbeams";
  group.renderOrder = 18;

  const specs = [
    { x: -28, y: 38, z: -85, scaleX: 28, scaleY: 92, rotation: -0.14, phase: 0.2 },
    { x: -10, y: 42, z: -90, scaleX: 24, scaleY: 88, rotation: 0.08, phase: 1.9 },
    { x: 18, y: 36, z: -80, scaleX: 32, scaleY: 96, rotation: 0.18, phase: 3.4 },
    { x: 8, y: 40, z: -86, scaleX: 22, scaleY: 82, rotation: -0.04, phase: 4.7 }
  ];

  const beams: BeamSprite[] = specs.map((spec, index) => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: new THREE.Color(index % 2 === 0 ? 0xffe2a6 : 0xfff0ca),
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    material.rotation = spec.rotation;

    const sprite = new THREE.Sprite(material);
    sprite.position.set(spec.x, spec.y, spec.z);
    sprite.scale.set(spec.scaleX, spec.scaleY, 1);
    sprite.renderOrder = 18;
    sprite.userData = { type: "decor", kind: "sunbeam" };
    group.add(sprite);

    return {
      sprite,
      material,
      basePosition: sprite.position.clone(),
      phase: spec.phase,
      speed: 0.1 + index * 0.016,
      drift: 0.55 + index * 0.2,
      baseOpacity: 0.07 + index * 0.012
    };
  });

  scene.add(group);

  function update(elapsed: number): void {
    for (const beam of beams) {
      beam.sprite.position.x = beam.basePosition.x + Math.sin(elapsed * beam.speed + beam.phase) * beam.drift;
      beam.sprite.position.y = beam.basePosition.y + Math.cos(elapsed * beam.speed * 0.7 + beam.phase) * beam.drift * 0.5;
      beam.material.opacity = clamp(
        beam.baseOpacity + Math.sin(elapsed * beam.speed * 1.35 + beam.phase) * 0.022,
        0.035,
        0.14
      );
    }
  }

  function destroy(): void {
    for (const beam of beams) {
      beam.material.dispose();
    }
    texture.dispose();
    group.removeFromParent();
  }

  return {
    group,
    update,
    destroy
  };
}

export function createGroundDapplePlane(
  scene: THREE.Scene,
  _camera: THREE.Camera,
  _renderer: THREE.WebGLRenderer,
  options: {
    strength?: number;
    enabled?: boolean;
    debug?: boolean;
  } = {}
): {
  group: THREE.Group;
  update: (elapsed: number) => void;
  destroy: () => void;
} {
  const strength = clamp(options.strength ?? 1, 0, 2.5);
  const enabled = options.enabled ?? true;
  const debug = options.debug ?? false;

  const { canvas, ctx, texture } = createCanvasTexture(1024, 512);
  const secondary = createCanvasTexture(1024, 512);
  const primarySpots = buildPlaneSpots(canvas.width, canvas.height);
  const secondarySpots = buildPlaneSpots(canvas.width, canvas.height).slice(0, 18);

  const group = new THREE.Group();
  group.name = "groundDapplePlane";
  group.position.set(0, -24, -58);
  group.renderOrder = 8;

  const primaryGeometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: clamp(0.38 * strength, 0, 0.58),
    toneMapped: false
  });
  const plane = new THREE.Mesh(primaryGeometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.scale.set(72, 44, 1);
  plane.renderOrder = 8;
  plane.userData = { type: "decor", kind: "ground-dapple-plane" };
  group.add(plane);

  const secondaryMaterial = new THREE.MeshBasicMaterial({
    map: secondary.texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: clamp(0.24 * strength, 0, 0.4),
    toneMapped: false
  });
  const secondaryGeometry = new THREE.PlaneGeometry(1, 1);
  const secondaryPlane = new THREE.Mesh(secondaryGeometry, secondaryMaterial);
  secondaryPlane.rotation.x = -Math.PI / 2;
  secondaryPlane.position.set(0, 0.08, -4);
  secondaryPlane.scale.set(44, 26, 1);
  secondaryPlane.renderOrder = 9;
  group.add(secondaryPlane);

  scene.add(group);

  let lastRenderedAt = -Infinity;

  function renderTexture(targetCtx: CanvasRenderingContext2D, width: number, height: number, spots: DynamicTextureSpot[], elapsed: number, alphaScale: number): void {
    targetCtx.clearRect(0, 0, width, height);
    const glowX = width * 0.48 + Math.sin(elapsed * 0.09) * width * 0.08;
    const glowY = height * 0.54 + Math.cos(elapsed * 0.07) * height * 0.05;
    const baseGlow = targetCtx.createRadialGradient(glowX, glowY, 0, glowX, glowY, width * 0.48);
    baseGlow.addColorStop(0, replaceAlpha("rgba(255, 222, 138, 0.11)", 0.92 * alphaScale));
    baseGlow.addColorStop(0.55, replaceAlpha("rgba(255, 198, 98, 0.06)", 0.7 * alphaScale));
    baseGlow.addColorStop(1, "rgba(255, 198, 98, 0)");
    targetCtx.fillStyle = baseGlow;
    targetCtx.fillRect(0, 0, width, height);

    const sideSweep = targetCtx.createLinearGradient(width * 0.08, height * 0.1, width * 0.92, height * 0.86);
    sideSweep.addColorStop(0, "rgba(255, 230, 162, 0)");
    sideSweep.addColorStop(0.42, replaceAlpha("rgba(255, 220, 140, 0.08)", 0.8 * alphaScale));
    sideSweep.addColorStop(1, "rgba(255, 220, 140, 0)");
    targetCtx.fillStyle = sideSweep;
    targetCtx.fillRect(0, 0, width, height);

    for (const spot of spots) {
      const x = spot.x + Math.sin(elapsed * spot.speed + spot.phase) * spot.driftX;
      const y = spot.y + Math.cos(elapsed * spot.speed * 0.7 + spot.phase) * spot.driftY;
      const opacity = spot.opacity * (0.68 + Math.sin(elapsed * spot.blinkSpeed + spot.phase) * 0.38) * alphaScale;
      drawGroundSpot(targetCtx, spot, x, y, opacity);
      if (spot.radiusX > 88) {
        drawGroundSpot(
          targetCtx,
          spot,
          x - Math.sin(elapsed * spot.speed * 0.52 + spot.phase) * 14,
          y + Math.cos(elapsed * spot.speed * 0.4 + spot.phase) * 10,
          opacity * 0.7
        );
      }
    }
  }

  function update(elapsed: number): void {
    group.visible = enabled && strength > 0;
    if (!group.visible) return;
    if (elapsed - lastRenderedAt < 1 / 30) return;

    lastRenderedAt = elapsed;
    renderTexture(ctx, canvas.width, canvas.height, primarySpots, elapsed, 1);
    renderTexture(secondary.ctx, secondary.canvas.width, secondary.canvas.height, secondarySpots, elapsed + 0.7, 0.86);
    texture.needsUpdate = true;
    secondary.texture.needsUpdate = true;

    if (debug && Math.floor(elapsed) % 4 === 0) {
      console.info("[sunDapple-groundPlane] active", {
        groundTextureSpotCount: primarySpots.length,
        secondarySpotCount: secondarySpots.length,
        lastUpdateTime: elapsed
      });
    }
  }

  function destroy(): void {
    primaryGeometry.dispose();
    secondaryGeometry.dispose();
    material.dispose();
    secondaryMaterial.dispose();
    texture.dispose();
    secondary.texture.dispose();
    group.removeFromParent();
  }

  update(0);

  return {
    group,
    update,
    destroy
  };
}
