import * as THREE from "three";

export type HotspotType = "offering" | "lamp";

export interface HotspotConfig {
  id: string;
  label: string;
  type: HotspotType;
  lon: number;
  lat: number;
  size?: "wall" | "main" | "altar";
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
  { id: "front-left-buddha", label: "左側小佛燈", type: "lamp", lon: -22, lat: 2, size: "wall" },
  { id: "front-right-buddha", label: "右側小佛燈", type: "lamp", lon: 22, lat: 2, size: "wall" },
  { id: "front-left-niche", label: "左前佛龕燈", type: "lamp", lon: -45, lat: -8, size: "wall" },
  { id: "front-right-niche", label: "右前佛龕燈", type: "lamp", lon: 45, lat: -8, size: "wall" },
  { id: "altar-left-front", label: "供桌左前燈", type: "lamp", lon: -12, lat: -24, size: "altar" },
  { id: "altar-center", label: "供桌中央燈", type: "lamp", lon: 0, lat: -25, size: "altar" },
  { id: "altar-right-front", label: "供桌右前燈", type: "lamp", lon: 12, lat: -24, size: "altar" },
  { id: "left-wall-upper", label: "左牆上層佛燈", type: "lamp", lon: -90, lat: 12, size: "wall" },
  { id: "left-wall-middle", label: "左牆中層佛燈", type: "lamp", lon: -92, lat: -2, size: "wall" },
  { id: "left-wall-lower", label: "左牆下層佛燈", type: "lamp", lon: -94, lat: -16, size: "wall" },
  { id: "left-wall-far", label: "左牆遠端佛燈", type: "lamp", lon: -125, lat: -6, size: "wall" },
  { id: "right-wall-upper", label: "右牆上層佛燈", type: "lamp", lon: 90, lat: 12, size: "wall" },
  { id: "right-wall-middle", label: "右牆中層佛燈", type: "lamp", lon: 92, lat: -2, size: "wall" },
  { id: "right-wall-lower", label: "右牆下層佛燈", type: "lamp", lon: 94, lat: -16, size: "wall" },
  { id: "right-wall-far", label: "右牆遠端佛燈", type: "lamp", lon: 125, lat: -6, size: "wall" },
  { id: "back-left-niche", label: "後壁左佛燈", type: "lamp", lon: 160, lat: -5, size: "wall" },
  { id: "back-right-niche", label: "後壁右佛燈", type: "lamp", lon: -160, lat: -5, size: "wall" }
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
