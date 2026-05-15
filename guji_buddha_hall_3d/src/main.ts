import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createPanoramaSphere, loadPanoramaTexture, PANORAMA_4K_IMAGE_URL, PANORAMA_8K_IMAGE_URL } from "./panorama";
import { ALL_HOTSPOTS, LAMP_HOTSPOTS, OFFERING_HOTSPOT, lonLatToVector3, makeHotspotTexture } from "./hotspots";
import { clearLampRecords, getLampRecord, loadLampRecords, loadOfferings, OfferingType, setLampRecord } from "./storage";
import { CandleManager } from "./candles";
import { OfferingManager } from "./offerings";
import { AppUI } from "./ui";
import { createFireflies, FireflySystem, updateFireflies } from "./fireflies";
import { createFrontDetailPatch } from "./frontDetailPatch";

const canvas = document.getElementById("sceneCanvas") as HTMLCanvasElement;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050403);

const INITIAL_FOV = 72;
const MIN_FOV = 56;
const MAX_FOV = 88;
const PANORAMA_YAW_OFFSET_DEG = 0;
const LAMP_DEBUG = new URLSearchParams(window.location.search).get("lampDebug") === "1";
const DISABLE_DETAIL_PATCH = new URLSearchParams(window.location.search).get("detailPatch") === "0";
const PATCH_DEBUG = new URLSearchParams(window.location.search).get("patchDebug") === "1";

const camera = new THREE.PerspectiveCamera(INITIAL_FOV, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 0.1);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.enableZoom = false;
controls.minDistance = 0.1;
controls.maxDistance = 2;
controls.minPolarAngle = THREE.MathUtils.degToRad(56);
controls.maxPolarAngle = THREE.MathUtils.degToRad(124);
controls.rotateSpeed = -0.42;
controls.target.set(0, 0, 0);
controls.update();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickableObjects: THREE.Object3D[] = [];
const hotspotMap = new Map(ALL_HOTSPOTS.map((hotspot) => [hotspot.id, hotspot]));
const panoramaError = document.getElementById("panoramaError") as HTMLElement | null;

const ui = new AppUI({
  onOffering: (type) => addOffering(type),
  onClearOfferings: () => {
    offeringManager.clear();
  },
  onConfirmLamp: (id, name) => {
    const config = hotspotMap.get(id);
    if (!config) return;
    const record = setLampRecord(id, name);
    candleManager.setLit(config, record);
  },
  onClearLamps: () => {
    clearLampRecords();
    candleManager.clear();
    ui.closeLampModal();
  },
  onResetView: () => resetView()
});

const candleManager = new CandleManager({
  scene,
  camera,
  renderer,
  radius: 488,
  debug: LAMP_DEBUG,
  yawOffsetDeg: PANORAMA_YAW_OFFSET_DEG
});
const offeringManager = new OfferingManager(scene, camera);
const clock = new THREE.Clock();

let pointerDown = { x: 0, y: 0 };
let hovered: THREE.Object3D | null = null;
let fireflies: FireflySystem | null = null;

init();

async function init(): Promise<void> {
  try {
    const texture = await loadPanoramaTexture(renderer);
    scene.add(createPanoramaSphere(texture, 500));
    if (!DISABLE_DETAIL_PATCH) {
      try {
        await createFrontDetailPatch(scene, renderer, {
          lonMin: -55,
          lonMax: 55,
          latMin: -38,
          latMax: 42,
          radius: 496,
          segmentsX: 180,
          segmentsY: 110,
          featherPx: 220,
          rotationY: -Math.PI / 2,
          yawOffsetDeg: 0,
          debug: PATCH_DEBUG
        });
      } catch (error) {
        console.warn("[front-detail-patch] skipped", error);
      }
    }
  } catch (error) {
    console.error(`Panorama failed: ${PANORAMA_8K_IMAGE_URL} / ${PANORAMA_4K_IMAGE_URL}`, error);
    showPanoramaError("全景圖片載入失敗，請確認 public/assets/guji_360_panorama_4096x2048.jpg 是否存在。");
    scene.add(createPanoramaSphere(createFallbackTexture(), 500));
  }

  fireflies = createFireflies(scene);

  createOfferingHotspot();
  candleManager.create(LAMP_HOTSPOTS, loadLampRecords());
  clickableObjects.push(...candleManager.clickable);
  offeringManager.restore(loadOfferings());

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("wheel", onWheelZoom, { passive: false });
  canvas.addEventListener("pointerleave", () => {
    hovered = null;
    canvas.style.cursor = "grab";
    ui.hideTooltip();
  });
  window.addEventListener("resize", onResize);
  animate();
}

function createOfferingHotspot(): void {
  const texture = makeHotspotTexture("offering");
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.name = "offering-table-hotspot";
  sprite.position.copy(lonLatToVector3(OFFERING_HOTSPOT.lon, OFFERING_HOTSPOT.lat, 492));
  sprite.scale.set(22, 22, 1);
  sprite.userData = { type: OFFERING_HOTSPOT.type, id: OFFERING_HOTSPOT.id, label: OFFERING_HOTSPOT.label };
  scene.add(sprite);
  clickableObjects.push(sprite);
}

function addOffering(type: OfferingType): void {
  offeringManager.add(type);
}

function onPointerDown(event: PointerEvent): void {
  canvas.classList.add("dragging");
  pointerDown = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event: PointerEvent): void {
  canvas.classList.remove("dragging");
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  if (distance > 8) return;
  const object = pickObject(event.clientX, event.clientY);
  if (!object) {
    logDebugLonLat(event.clientX, event.clientY);
    return;
  }
  handlePick(object);
}

function onPointerMove(event: PointerEvent): void {
  const object = pickObject(event.clientX, event.clientY);
  if (object !== hovered) {
    hovered = object;
    canvas.style.cursor = object ? "pointer" : "grab";
  }
  if (!object) {
    ui.hideTooltip();
    return;
  }
  const label = String(object.userData.label ?? "");
  if (object.userData.type === "lamp") {
    const record = getLampRecord(String(object.userData.id));
    if (record) {
      ui.showTooltip(`${label}<br>點燈者：${escapeHtml(record.name)}`, event.clientX, event.clientY);
    } else {
      ui.showTooltip(`${label}<br>點擊點燈`, event.clientX, event.clientY);
    }
  } else {
    ui.showTooltip(`${label}<br>點擊供佛`, event.clientX, event.clientY);
  }
}

function onWheelZoom(event: WheelEvent): void {
  event.preventDefault();
  const delta = Math.sign(event.deltaY) * 3.2;
  camera.fov = THREE.MathUtils.clamp(camera.fov + delta, MIN_FOV, MAX_FOV);
  camera.updateProjectionMatrix();
}

function pickObject(clientX: number, clientY: number): THREE.Object3D | null {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(clickableObjects, false);
  return intersects[0]?.object ?? null;
}

function logDebugLonLat(clientX: number, clientY: number): void {
  if (!LAMP_DEBUG) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const direction = raycaster.ray.direction.clone().normalize();
  const lon = THREE.MathUtils.radToDeg(Math.atan2(direction.x, -direction.z)) - PANORAMA_YAW_OFFSET_DEG;
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)));
  console.info("clicked lon/lat:", {
    lon: Number(lon.toFixed(2)),
    lat: Number(lat.toFixed(2))
  });
}

function handlePick(object: THREE.Object3D): void {
  const { type, id } = object.userData as { type?: string; id?: string };
  if (type === "offering") {
    ui.openOfferingPanel();
    return;
  }
  if (type === "lamp" && id) {
    const config = hotspotMap.get(id);
    if (!config) return;
    ui.openLampModal(config, getLampRecord(id));
  }
}

function resetView(): void {
  camera.fov = INITIAL_FOV;
  camera.position.set(0, 0, 0.1);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  controls.update();
  candleManager.update(time);
  offeringManager.update(time);
  if (fireflies) updateFireflies(fireflies, delta, time);
  animateOfferingHotspot(time);
  renderer.render(scene, camera);
}

function animateOfferingHotspot(time: number): void {
  const object = clickableObjects.find((item) => item.userData.id === "offering-table");
  if (!object) return;
  const pulse = 1 + Math.sin(time * 2.4) * 0.06;
  object.scale.set(22 * pulse, 22 * pulse, 1);
  object.lookAt(camera.position);
}

function createFallbackTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#14100c");
  g.addColorStop(0.5, "#352113");
  g.addColorStop(1, "#080604");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 230, 170, 0.86)";
  ctx.font = "700 88px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("請確認 public/assets/guji_360_panorama_4096x2048.jpg 是否存在", canvas.width / 2, canvas.height * 0.52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function showPanoramaError(message: string): void {
  if (!panoramaError) return;
  panoramaError.textContent = message;
  panoramaError.classList.add("open");
  panoramaError.setAttribute("aria-hidden", "false");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[char] ?? char;
  });
}
