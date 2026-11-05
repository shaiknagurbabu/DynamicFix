import { modules, type RecordData } from "../../shared/modules";

export type RecordStore = Record<string, RecordData[]>;

const storageKey = "dynamicfix-erp-records";

export function createInitialStore(): RecordStore {
  return Object.fromEntries(modules.map((item) => [item.id, item.seed.map((record) => ({ ...record }))]));
}

export function loadStore(): RecordStore {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return createInitialStore();
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved ERP data is not a valid record store. Use Reset sample data to restore the prototype.");
  }
  const store = parsed as RecordStore;
  for (const item of modules) {
    if (!Array.isArray(store[item.id]) || store[item.id].some((record) =>
      !record || typeof record !== "object" || Array.isArray(record) ||
      Object.values(record).some((value) => typeof value !== "string"),
    )) {
      throw new Error(`Saved ERP data for ${item.name} is invalid. Use Reset sample data to restore the prototype.`);
    }
  }
  return store;
}

export function saveStore(store: RecordStore): void {
  window.localStorage.setItem(storageKey, JSON.stringify(store));
}
