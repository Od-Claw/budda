export const STORAGE_KEYS = {
  offerings: "guji-temple-offerings",
  lamps: "guji-temple-lamps"
} as const;

export type OfferingType =
  | "flower"
  | "lotus"
  | "water"
  | "fruit"
  | "incense"
  | "butterLamp"
  | "gold";

export interface LampRecord {
  id: string;
  name: string;
  litAt: string;
}

export interface OfferingRecord {
  id: string;
  type: OfferingType;
  createdAt: string;
  slotIndex: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to read localStorage key ${key}`, error);
    return fallback;
  }
}

function writeJson<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadOfferings(): OfferingRecord[] {
  return readJson<OfferingRecord[]>(STORAGE_KEYS.offerings, []);
}

export function saveOfferings(records: OfferingRecord[]): void {
  writeJson(STORAGE_KEYS.offerings, records);
}

export function addOfferingRecord(type: OfferingType, slotIndex: number): OfferingRecord {
  const record: OfferingRecord = {
    id: `offering-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    createdAt: new Date().toISOString(),
    slotIndex
  };
  const records = loadOfferings();
  records.push(record);
  saveOfferings(records);
  return record;
}

export function clearOfferingRecords(): void {
  saveOfferings([]);
}

export function loadLampRecords(): LampRecord[] {
  return readJson<LampRecord[]>(STORAGE_KEYS.lamps, []);
}

export function saveLampRecords(records: LampRecord[]): void {
  writeJson(STORAGE_KEYS.lamps, records);
}

export function getLampRecord(id: string): LampRecord | undefined {
  return loadLampRecords().find((record) => record.id === id);
}

export function setLampRecord(id: string, name: string): LampRecord {
  const records = loadLampRecords().filter((record) => record.id !== id);
  const record: LampRecord = {
    id,
    name,
    litAt: new Date().toISOString()
  };
  records.push(record);
  saveLampRecords(records);
  return record;
}

export function clearLampRecords(): void {
  saveLampRecords([]);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
