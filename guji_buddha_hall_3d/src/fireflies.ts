import * as THREE from "three";

interface Firefly {
  sprite: THREE.Sprite;
  basePosition: THREE.Vector3;
  seed: number;
  orbitRadius: number;
  speed: number;
  baseScale: number;
  blinkSpeed: number;
  blinkOffset: number;
}

export interface FireflySystem {
  group: THREE.Group;
  fireflies: Firefly[];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeFireflyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 46);
  glow.addColorStop(0, "rgba(255, 255, 236, 1)");
  glow.addColorStop(0.11, "rgba(255, 247, 176, 0.98)");
  glow.addColorStop(0.34, "rgba(255, 215, 106, 0.58)");
  glow.addColorStop(0.72, "rgba(255, 184, 61, 0.2)");
  glow.addColorStop(1, "rgba(255, 184, 61, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createFireflySprite(texture: THREE.Texture, index: number): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = `firefly-${index}`;
  sprite.userData = { type: "decor", kind: "firefly" };
  sprite.raycast = () => undefined;
  sprite.renderOrder = 50;
  return sprite;
}

function makeFirefly(texture: THREE.Texture, index: number, foreground: boolean): Firefly {
  const sprite = createFireflySprite(texture, index);
  const basePosition = foreground
    ? new THREE.Vector3(randomBetween(-20, 20), randomBetween(-7, 9), randomBetween(-48, -24))
    : new THREE.Vector3(randomBetween(-34, 34), randomBetween(-9, 16), randomBetween(-88, -30));
  const baseScale = foreground ? randomBetween(0.65, 1.25) : randomBetween(0.42, 0.9);
  sprite.position.copy(basePosition);
  sprite.scale.set(baseScale, baseScale, 1);

  return {
    sprite,
    basePosition,
    seed: randomBetween(0, Math.PI * 2),
    orbitRadius: foreground ? randomBetween(3.8, 8.2) : randomBetween(5.5, 13.5),
    speed: foreground ? randomBetween(0.16, 0.36) : randomBetween(0.12, 0.28),
    baseScale,
    blinkSpeed: randomBetween(1.35, 3.15),
    blinkOffset: randomBetween(0, Math.PI * 2)
  };
}

export function createFireflies(scene: THREE.Scene): FireflySystem {
  const group = new THREE.Group();
  group.name = "ambientFireflies";
  const texture = makeFireflyTexture();
  const fireflies: Firefly[] = [];

  for (let index = 0; index < 7; index += 1) {
    const foreground = index < 3;
    const firefly = makeFirefly(texture, index, foreground);
    group.add(firefly.sprite);
    fireflies.push(firefly);
  }

  scene.add(group);
  return { group, fireflies };
}

export function updateFireflies(system: FireflySystem, _delta: number, elapsed: number): void {
  for (const firefly of system.fireflies) {
    const t = elapsed * firefly.speed + firefly.seed;
    firefly.sprite.position.x =
      firefly.basePosition.x +
      Math.sin(t * 0.9) * firefly.orbitRadius +
      Math.cos(t * 0.37) * firefly.orbitRadius * 0.45;
    firefly.sprite.position.y =
      firefly.basePosition.y +
      Math.sin(t * 1.35 + firefly.seed) * firefly.orbitRadius * 0.55 +
      Math.sin(elapsed * 0.35 + firefly.seed) * 0.6;
    firefly.sprite.position.z =
      firefly.basePosition.z +
      Math.cos(t * 0.7) * firefly.orbitRadius * 0.7;

    const blink =
      0.35 +
      0.65 *
        Math.pow(
          0.5 + 0.5 * Math.sin(elapsed * firefly.blinkSpeed + firefly.blinkOffset),
          2.2
        );
    const micro = 0.85 + Math.sin(elapsed * 12 + firefly.seed) * 0.15;
    const opacity = THREE.MathUtils.clamp(blink * micro * 0.46, 0.06, 0.44);
    const material = firefly.sprite.material as THREE.SpriteMaterial;
    material.opacity = opacity;

    const scalePulse = firefly.baseScale * (0.72 + opacity * 0.42);
    firefly.sprite.scale.set(scalePulse, scalePulse, 1);
  }
}
