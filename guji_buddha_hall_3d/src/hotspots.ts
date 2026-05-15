import * as THREE from "three";

export type HotspotType = "offering" | "lamp";

export interface HotspotConfig {
  id: string;
  label: string;
  type: HotspotType;
  lon: number;
  lat: number;
  size?: "wall" | "main";
  visualLonOffset?: number;
  visualLatOffset?: number;
}

export const OFFERING_HOTSPOT: HotspotConfig = {
  id: "offering-table",
  label: "供佛",
  type: "offering",
  lon: 0,
  lat: -24
};

export const LAMP_HOTSPOTS: HotspotConfig[] = [
  { id: "front-small-left", label: "大佛左側小佛燈", type: "lamp", lon: -22, lat: 13, size: "wall" },
  { id: "front-small-right", label: "大佛右側小佛燈", type: "lamp", lon: 20, lat: 13, size: "wall" },
  { id: "main-left-1", label: "大佛左燈一", type: "lamp", lon: -18, lat: -18, size: "main" },
  { id: "main-left-2", label: "大佛左燈二", type: "lamp", lon: -26, lat: -22, size: "main" },
  { id: "main-right-1", label: "大佛右燈一", type: "lamp", lon: 18, lat: -18, size: "main" },
  { id: "main-right-2", label: "大佛右燈二", type: "lamp", lon: 26, lat: -22, size: "main" },
  { id: "front-left-shrine", label: "左前佛龕燈", type: "lamp", lon: -58, lat: -5, size: "wall" },
  { id: "front-right-shrine", label: "右前佛龕燈", type: "lamp", lon: 55, lat: -5, size: "wall" },
  { id: "left-outer-top", label: "左外牆上層佛燈", type: "lamp", lon: -154, lat: 32, size: "wall" },
  { id: "left-outer-mid", label: "左外牆中層佛燈", type: "lamp", lon: -152, lat: 16, size: "wall" },
  { id: "left-outer-low", label: "左外牆下層佛燈", type: "lamp", lon: -152, lat: -5, size: "wall" },
  { id: "left-inner-top", label: "左牆上層佛燈", type: "lamp", lon: -110, lat: 33, size: "wall" },
  { id: "left-inner-mid", label: "左牆中層佛燈", type: "lamp", lon: -110, lat: 14, size: "wall" },
  { id: "left-inner-low", label: "左牆下層佛燈", type: "lamp", lon: -110, lat: -6, size: "wall" },
  { id: "right-inner-top", label: "右牆上層佛燈", type: "lamp", lon: 107, lat: 33, size: "wall" },
  { id: "right-inner-mid", label: "右牆中層佛燈", type: "lamp", lon: 107, lat: 14, size: "wall" },
  { id: "right-inner-low", label: "右牆下層佛燈", type: "lamp", lon: 107, lat: -5, size: "wall" },
  { id: "right-outer-top", label: "右外牆上層佛燈", type: "lamp", lon: 149, lat: 33, size: "wall" },
  { id: "right-outer-mid", label: "右外牆中層佛燈", type: "lamp", lon: 149, lat: 14, size: "wall" },
  { id: "right-outer-low", label: "右外牆下層佛燈", type: "lamp", lon: 149, lat: -5, size: "wall" },
  { id: "back-left-niche", label: "後壁左側佛燈", type: "lamp", lon: -177, lat: -4, size: "wall" },
  { id: "back-right-niche", label: "後壁右側佛燈", type: "lamp", lon: 177, lat: -4, size: "wall" }
];

export const ALL_HOTSPOTS: HotspotConfig[] = [OFFERING_HOTSPOT, ...LAMP_HOTSPOTS];

export function lonLatToVector3(lon: number, lat: number, radius: number): THREE.Vector3 {
  const lonRad = THREE.MathUtils.degToRad(lon);
  const latRad = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(
    radius * Math.sin(lonRad) * Math.cos(latRad),
    radius * Math.sin(latRad),
    -radius * Math.cos(lonRad) * Math.cos(latRad)
  );
}

export function createCanvasSpriteTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256): THREE.CanvasTexture {
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

export function makeHotspotTexture(kind: "offering" | "lamp" | "lampLit"): THREE.CanvasTexture {
  return createCanvasSpriteTexture((ctx, size) => {
    const cx = size / 2;
    const cy = size / 2;
    ctx.clearRect(0, 0, size, size);

    const outer = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.46);
    if (kind === "lampLit") {
      outer.addColorStop(0, "rgba(255, 246, 184, 1)");
      outer.addColorStop(0.22, "rgba(255, 174, 60, 0.86)");
      outer.addColorStop(1, "rgba(255, 120, 34, 0)");
    } else {
      outer.addColorStop(0, "rgba(255, 228, 142, 0.9)");
      outer.addColorStop(0.34, "rgba(225, 158, 52, 0.38)");
      outer.addColorStop(1, "rgba(225, 158, 52, 0)");
    }
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = kind === "offering" ? "rgba(255, 238, 178, 0.96)" : "rgba(255, 206, 94, 0.94)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.23, 0, Math.PI * 2);
    ctx.stroke();

    if (kind === "offering") {
      ctx.fillStyle = "rgba(255, 237, 182, 0.94)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 32);
      ctx.bezierCurveTo(cx + 32, cy - 10, cx + 32, cy + 28, cx, cy + 42);
      ctx.bezierCurveTo(cx - 32, cy + 28, cx - 32, cy - 10, cx, cy - 32);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 236, 169, 0.95)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 16, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = kind === "lampLit" ? "rgba(255, 112, 28, 0.98)" : "rgba(255, 206, 91, 0.84)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 38);
      ctx.bezierCurveTo(cx + 23, cy - 10, cx + 13, cy + 16, cx, cy + 24);
      ctx.bezierCurveTo(cx - 15, cy + 12, cx - 18, cy - 10, cx, cy - 38);
      ctx.fill();
    }
  });
}
