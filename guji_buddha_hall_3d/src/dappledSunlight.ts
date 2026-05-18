import * as THREE from "three";

type DappleOptions = {
  strength?: number;
  shadowStrength?: number;
  glowStrength?: number;
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
  shape: "ellipse" | "leaf" | "twig";
  stretch: number;
  swayX: number;
  swayY: number;
};

type GlowSpot = {
  x: number;
  y: number;
  radius: number;
  speed: number;
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
  baseOpacity: number;
  drift: number;
};

export type DappledSunlightSystem = {
  overlayCanvas: HTMLCanvasElement;
  glowCanvas: HTMLCanvasElement;
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

function createOverlayCanvas(className: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  return canvas;
}

function fitInternalSize(viewportWidth: number, viewportHeight: number): { width: number; height: number } {
  const aspect = Math.max(0.6, viewportWidth / Math.max(1, viewportHeight));
  const targetHeight = clamp(Math.round(540 / Math.max(1, window.devicePixelRatio * 0.75)), 360, 576);
  const width = clamp(Math.round(targetHeight * aspect), 640, 1024);
  const height = clamp(Math.round(width / aspect), 360, 576);
  return { width, height };
}

function buildLeaves(width: number, height: number): LeafBlob[] {
  const random = createSeededRandom(0x41c64e6d);
  const count = 160;
  const leaves: LeafBlob[] = [];

  for (let index = 0; index < count; index += 1) {
    const shapeRoll = random();
    const upperBias = Math.pow(random(), 1.8);
    leaves.push({
      x: random() * width,
      y: upperBias * height * 0.92,
      size: 12 + random() * 44,
      angle: random() * Math.PI * 2,
      speed: 0.06 + random() * 0.16,
      phase: random() * Math.PI * 2,
      opacity: 0.06 + random() * 0.14,
      shape: shapeRoll < 0.46 ? "ellipse" : shapeRoll < 0.84 ? "leaf" : "twig",
      stretch: 0.55 + random() * 1.4,
      swayX: 4 + random() * 18,
      swayY: 2 + random() * 12
    });
  }

  return leaves;
}

function buildGlowSpots(width: number, height: number): GlowSpot[] {
  const random = createSeededRandom(0x9e3779b9);
  const tints = [
    "rgba(255, 220, 135, 0.16)",
    "rgba(255, 190, 80, 0.10)",
    "rgba(255, 245, 190, 0.08)"
  ];
  const count = 30;
  const spots: GlowSpot[] = [];

  for (let index = 0; index < count; index += 1) {
    const yBand = index < 10 ? 0.28 : index < 20 ? 0.56 : 0.9;
    const xCenter = index < 10 ? 0.45 : index < 20 ? 0.5 : 0.52;
    const xSpread = index < 10 ? 0.3 : index < 20 ? 0.22 : 0.18;
    spots.push({
      x: (xCenter - xSpread + random() * xSpread * 2) * width,
      y: (0.14 + random() * yBand) * height,
      radius: index < 20 ? 28 + random() * 76 : 34 + random() * 96,
      speed: 0.08 + random() * 0.14,
      phase: random() * Math.PI * 2,
      opacity: 0.07 + random() * 0.12,
      driftX: 5 + random() * 20,
      driftY: 3 + random() * 14,
      tint: tints[index % tints.length]
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
    ctx.ellipse(0, 0, leaf.size * 0.55, leaf.size * 0.28 * leaf.stretch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (leaf.shape === "leaf") {
    const width = leaf.size * 0.44;
    const height = leaf.size * 0.95 * leaf.stretch;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.54);
    ctx.quadraticCurveTo(width, -height * 0.08, width * 0.48, height * 0.52);
    ctx.quadraticCurveTo(0, height * 0.82, -width * 0.48, height * 0.52);
    ctx.quadraticCurveTo(-width, -height * 0.08, 0, -height * 0.54);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
    ctx.lineWidth = Math.max(0.6, leaf.size * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.44);
    ctx.lineTo(0, height * 0.62);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(0.8, leaf.size * 0.12);
  ctx.beginPath();
  ctx.moveTo(-leaf.size * 0.5, -leaf.size * 0.2);
  ctx.quadraticCurveTo(-leaf.size * 0.12, -leaf.size * 0.7, 0, 0);
  ctx.quadraticCurveTo(leaf.size * 0.12, leaf.size * 0.72, leaf.size * 0.48, leaf.size * 0.24);
  ctx.stroke();
  ctx.restore();
}

function drawSoftSpot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alphaBoost = 1
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color.replace(/[\d.]+\)$/, `${0.9 * alphaBoost})`));
  gradient.addColorStop(0.42, color.replace(/[\d.]+\)$/, `${0.44 * alphaBoost})`));
  gradient.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function createDappledSunlight(options: DappleOptions = {}): DappledSunlightSystem {
  const appRoot = document.getElementById("app") ?? document.body;
  const overlayCanvas = createOverlayCanvas("dapple-shadow-overlay");
  const glowCanvas = createOverlayCanvas("dapple-glow-overlay");
  const overlayContext = overlayCanvas.getContext("2d");
  const glowContext = glowCanvas.getContext("2d");

  if (!overlayContext || !glowContext) {
    throw new Error("Canvas 2D context unavailable for dappled sunlight overlays");
  }

  const overlayCtx = overlayContext;
  const glowCtx = glowContext;

  const enabled = options.enabled ?? true;
  const debug = options.debug ?? false;
  const strength = clamp(options.strength ?? 1, 0, 2.2);
  const shadowStrength = clamp(options.shadowStrength ?? 1, 0, 2.4);
  const glowStrength = clamp(options.glowStrength ?? 1, 0, 2.4);

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let internalSize = fitInternalSize(viewportWidth, viewportHeight);
  let leaves = buildLeaves(internalSize.width, internalSize.height);
  let glowSpots = buildGlowSpots(internalSize.width, internalSize.height);
  let lastRenderedAt = -Infinity;
  let lastDebugLogAt = -Infinity;

  function applyStyles(): void {
    overlayCanvas.width = internalSize.width;
    overlayCanvas.height = internalSize.height;
    glowCanvas.width = internalSize.width;
    glowCanvas.height = internalSize.height;

    overlayCanvas.style.width = "100vw";
    overlayCanvas.style.height = "100vh";
    glowCanvas.style.width = "100vw";
    glowCanvas.style.height = "100vh";
    overlayCanvas.style.display = enabled ? "block" : "none";
    glowCanvas.style.display = enabled ? "block" : "none";
    overlayCanvas.style.opacity = String(clamp(0.34 * strength * shadowStrength, 0, 0.46));
    glowCanvas.style.opacity = String(clamp(0.2 * strength * glowStrength, 0, 0.3));
  }

  function resize(): void {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    internalSize = fitInternalSize(viewportWidth, viewportHeight);
    leaves = buildLeaves(internalSize.width, internalSize.height);
    glowSpots = buildGlowSpots(internalSize.width, internalSize.height);
    applyStyles();
    if (debug) {
      console.info("[sunDapple] resize", {
        viewportWidth,
        viewportHeight,
        internalWidth: internalSize.width,
        internalHeight: internalSize.height,
        leafCount: leaves.length,
        glowCount: glowSpots.length,
        updateIntervalMs: 33
      });
    }
  }

  function renderShadowLayer(elapsed: number): void {
    const width = internalSize.width;
    const height = internalSize.height;
    overlayCtx.clearRect(0, 0, width, height);
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.fillStyle = "rgba(0, 0, 0, 0)";
    overlayCtx.fillRect(0, 0, width, height);

    const canopyGradient = overlayCtx.createLinearGradient(0, 0, 0, height * 0.74);
    canopyGradient.addColorStop(0, "rgba(6, 12, 4, 0.18)");
    canopyGradient.addColorStop(0.24, "rgba(12, 18, 7, 0.10)");
    canopyGradient.addColorStop(0.72, "rgba(0, 0, 0, 0.02)");
    canopyGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    overlayCtx.fillStyle = canopyGradient;
    overlayCtx.fillRect(0, 0, width, height);

    for (let index = 0; index < leaves.length; index += 1) {
      const leaf = leaves[index];
      const swayX = Math.sin(elapsed * leaf.speed + leaf.phase) * leaf.swayX;
      const swayY = Math.cos(elapsed * leaf.speed * 0.7 + leaf.phase) * leaf.swayY;
      const angle = leaf.angle + Math.sin(elapsed * leaf.speed * 0.3 + leaf.phase) * 0.08;
      const tintIndex = index % 3;
      overlayCtx.fillStyle =
        tintIndex === 0
          ? `rgba(8, 16, 6, ${leaf.opacity})`
          : tintIndex === 1
            ? `rgba(24, 32, 10, ${leaf.opacity * 0.92})`
            : `rgba(0, 0, 0, ${leaf.opacity * 0.72})`;
      drawLeafShape(overlayCtx, leaf, leaf.x + swayX, leaf.y + swayY, angle);
    }

    overlayCtx.globalCompositeOperation = "destination-out";
    for (let index = 0; index < glowSpots.length; index += 1) {
      const spot = glowSpots[index];
      const x = spot.x + Math.sin(elapsed * spot.speed + spot.phase) * spot.driftX;
      const y = spot.y + Math.cos(elapsed * spot.speed * 0.8 + spot.phase) * spot.driftY;
      drawSoftSpot(overlayCtx, x, y, spot.radius * 0.72, "rgba(255, 255, 255, 0.075)", 0.9);
    }
    overlayCtx.globalCompositeOperation = "source-over";
  }

  function renderGlowLayer(elapsed: number): void {
    const width = internalSize.width;
    const height = internalSize.height;
    glowCtx.clearRect(0, 0, width, height);

    const topGlow = glowCtx.createRadialGradient(
      width * 0.42,
      height * 0.08,
      width * 0.04,
      width * 0.42,
      height * 0.08,
      width * 0.52
    );
    topGlow.addColorStop(0, "rgba(255, 241, 198, 0.22)");
    topGlow.addColorStop(0.32, "rgba(255, 210, 116, 0.12)");
    topGlow.addColorStop(1, "rgba(255, 210, 116, 0)");
    glowCtx.fillStyle = topGlow;
    glowCtx.fillRect(0, 0, width, height);

    const floorGlow = glowCtx.createRadialGradient(
      width * 0.5,
      height * 0.82,
      0,
      width * 0.5,
      height * 0.82,
      width * 0.28
    );
    floorGlow.addColorStop(0, "rgba(255, 226, 150, 0.1)");
    floorGlow.addColorStop(0.5, "rgba(255, 197, 98, 0.05)");
    floorGlow.addColorStop(1, "rgba(255, 197, 98, 0)");
    glowCtx.fillStyle = floorGlow;
    glowCtx.fillRect(0, 0, width, height);

    const altarGlow = glowCtx.createRadialGradient(
      width * 0.5,
      height * 0.46,
      0,
      width * 0.5,
      height * 0.46,
      width * 0.18
    );
    altarGlow.addColorStop(0, "rgba(255, 228, 164, 0.1)");
    altarGlow.addColorStop(0.5, "rgba(255, 198, 104, 0.06)");
    altarGlow.addColorStop(1, "rgba(255, 198, 104, 0)");
    glowCtx.fillStyle = altarGlow;
    glowCtx.fillRect(0, 0, width, height);

    const beamStart = width * (0.28 + Math.sin(elapsed * 0.07) * 0.03);
    const beamGradient = glowCtx.createLinearGradient(beamStart, 0, width * 0.62, height * 0.72);
    beamGradient.addColorStop(0, "rgba(255, 242, 205, 0.22)");
    beamGradient.addColorStop(0.16, "rgba(255, 218, 132, 0.11)");
    beamGradient.addColorStop(0.62, "rgba(255, 200, 102, 0.025)");
    beamGradient.addColorStop(1, "rgba(255, 200, 102, 0)");
    glowCtx.fillStyle = beamGradient;
    glowCtx.beginPath();
    glowCtx.moveTo(width * 0.12, 0);
    glowCtx.lineTo(width * 0.34, 0);
    glowCtx.lineTo(width * 0.68, height * 0.78);
    glowCtx.lineTo(width * 0.48, height * 0.78);
    glowCtx.closePath();
    glowCtx.fill();

    const sideBeam = glowCtx.createLinearGradient(width * 0.78, 0, width * 0.92, height * 0.68);
    sideBeam.addColorStop(0, "rgba(255, 243, 215, 0.16)");
    sideBeam.addColorStop(0.22, "rgba(255, 214, 126, 0.07)");
    sideBeam.addColorStop(1, "rgba(255, 214, 126, 0)");
    glowCtx.fillStyle = sideBeam;
    glowCtx.beginPath();
    glowCtx.moveTo(width * 0.74, 0);
    glowCtx.lineTo(width * 0.83, 0);
    glowCtx.lineTo(width * 0.98, height * 0.72);
    glowCtx.lineTo(width * 0.9, height * 0.72);
    glowCtx.closePath();
    glowCtx.fill();

    for (const spot of glowSpots) {
      const x = spot.x + Math.sin(elapsed * spot.speed + spot.phase) * spot.driftX;
      const y = spot.y + Math.cos(elapsed * spot.speed * 0.75 + spot.phase) * spot.driftY;
      const pulse = 0.78 + Math.sin(elapsed * 0.18 + spot.phase) * 0.16;
      drawSoftSpot(glowCtx, x, y, spot.radius, spot.tint, pulse);
    }
  }

  function update(elapsed: number): void {
    if (!enabled) return;
    if (elapsed - lastRenderedAt < 1 / 30) return;
    lastRenderedAt = elapsed;

    renderShadowLayer(elapsed);
    renderGlowLayer(elapsed);

    if (debug && elapsed - lastDebugLogAt > 5) {
      lastDebugLogAt = elapsed;
      console.info("[sunDapple] active", {
        leafCount: leaves.length,
        glowCount: glowSpots.length,
        updateIntervalMs: 33,
        strength,
        shadowStrength,
        glowStrength
      });
    }
  }

  function destroy(): void {
    overlayCanvas.remove();
    glowCanvas.remove();
  }

  appRoot.appendChild(overlayCanvas);
  appRoot.appendChild(glowCanvas);
  resize();
  update(0);

  if (debug) {
    console.info("[sunDapple] created", {
      enabled,
      leafCount: leaves.length,
      glowCount: glowSpots.length,
      updateIntervalMs: 33,
      strength,
      shadowStrength,
      glowStrength
    });
  }

  return {
    overlayCanvas,
    glowCanvas,
    update,
    resize,
    destroy
  };
}

function createSunbeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable for sunbeam texture");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const beam = ctx.createLinearGradient(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
  beam.addColorStop(0, "rgba(255, 245, 214, 0)");
  beam.addColorStop(0.08, "rgba(255, 236, 184, 0.2)");
  beam.addColorStop(0.34, "rgba(255, 214, 128, 0.14)");
  beam.addColorStop(0.75, "rgba(255, 190, 88, 0.04)");
  beam.addColorStop(1, "rgba(255, 190, 88, 0)");

  const core = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.14,
    canvas.width * 0.02,
    canvas.width * 0.5,
    canvas.height * 0.36,
    canvas.width * 0.36
  );
  core.addColorStop(0, "rgba(255, 250, 228, 0.4)");
  core.addColorStop(0.28, "rgba(255, 222, 145, 0.15)");
  core.addColorStop(1, "rgba(255, 222, 145, 0)");

  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.38, 0);
  ctx.lineTo(canvas.width * 0.62, 0);
  ctx.lineTo(canvas.width * 0.74, canvas.height);
  ctx.lineTo(canvas.width * 0.26, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = core;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
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
    { x: -28, y: 38, z: -85, scaleX: 28, scaleY: 92, rotation: -0.16, phase: 0.2 },
    { x: -10, y: 42, z: -90, scaleX: 24, scaleY: 88, rotation: 0.08, phase: 1.9 },
    { x: 18, y: 36, z: -80, scaleX: 32, scaleY: 96, rotation: 0.18, phase: 3.4 },
    { x: 8, y: 40, z: -86, scaleX: 22, scaleY: 82, rotation: -0.05, phase: 4.7 }
  ];

  const beams: BeamSprite[] = specs.map((spec, index) => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: new THREE.Color(index % 2 === 0 ? 0xffe2a6 : 0xfff0ca),
      transparent: true,
      opacity: 0.09,
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
      speed: 0.11 + index * 0.014,
      baseOpacity: 0.08 + index * 0.014,
      drift: 0.5 + index * 0.22
    };
  });

  scene.add(group);

  function update(elapsed: number): void {
    for (const beam of beams) {
      beam.sprite.position.x = beam.basePosition.x + Math.sin(elapsed * beam.speed + beam.phase) * beam.drift;
      beam.sprite.position.y = beam.basePosition.y + Math.cos(elapsed * beam.speed * 0.7 + beam.phase) * beam.drift * 0.55;
      beam.material.opacity = clamp(
        beam.baseOpacity + Math.sin(elapsed * beam.speed * 1.4 + beam.phase) * 0.024,
        0.04,
        0.16
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
