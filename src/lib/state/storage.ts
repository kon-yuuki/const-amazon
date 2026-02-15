"use client";

import Dexie, { type Table } from "dexie";

import { createDefaultState } from "@/lib/state/defaults";
import { migrateToLatest } from "@/lib/state/migrations";
import type { AppState } from "@/types/domain";

type AppStateRecord = {
  id: "appState";
  value: AppState;
};

class ConstDexie extends Dexie {
  appState!: Table<AppStateRecord, "appState">;

  constructor() {
    super("const-app-db-dexie");
    this.version(1).stores({
      appState: "&id",
    });
  }
}

const db = new ConstDexie();

function stamp(state: AppState): AppState {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
  };
}

function openLegacyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("const-app-db");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function readLegacyValue<T>(key: string): Promise<T | undefined> {
  try {
    const legacyDb = await openLegacyStore();
    if (!legacyDb.objectStoreNames.contains("const-app-kv")) {
      legacyDb.close();
      return undefined;
    }

    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = legacyDb.transaction("const-app-kv", "readonly");
      const store = tx.objectStore("const-app-kv");
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => legacyDb.close();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return undefined;
  }
}

async function migrateFromLegacyIfNeeded(): Promise<AppState | null> {
  const already = await db.appState.get("appState");
  if (already?.value) {
    return already.value;
  }

  const [schemaVersion, items, members, settings, updatedAt] = await Promise.all([
    readLegacyValue<number>("schemaVersion"),
    readLegacyValue<unknown[]>("items"),
    readLegacyValue<unknown[]>("members"),
    readLegacyValue<Record<string, unknown>>("settings"),
    readLegacyValue<string>("updatedAt"),
  ]);

  const hasLegacyData = [schemaVersion, items, members, settings, updatedAt].some((value) => value !== undefined);
  if (!hasLegacyData) {
    return null;
  }

  const migrated = migrateToLatest({
    schemaVersion,
    items,
    members,
    settings,
    updatedAt,
  });

  await db.appState.put({ id: "appState", value: migrated });
  return migrated;
}

export async function loadAppState(): Promise<AppState> {
  try {
    const record = await db.appState.get("appState");
    if (record?.value) {
      const migrated = migrateToLatest(record.value);
      if (migrated.updatedAt !== record.value.updatedAt || migrated.schemaVersion !== record.value.schemaVersion) {
        await db.appState.put({ id: "appState", value: migrated });
      }
      return migrated;
    }

    const legacyMigrated = await migrateFromLegacyIfNeeded();
    if (legacyMigrated) {
      return legacyMigrated;
    }

    const defaults = createDefaultState();
    await db.appState.put({ id: "appState", value: defaults });
    return defaults;
  } catch (error) {
    console.error("Failed to load AppState from IndexedDB", error);
    return createDefaultState();
  }
}

export async function saveAppState(nextState: AppState): Promise<AppState> {
  const stamped = stamp(nextState);

  try {
    await db.appState.put({ id: "appState", value: stamped });
    return stamped;
  } catch (error) {
    console.error("Failed to save AppState to IndexedDB", error);
    throw new Error("Persist failed");
  }
}

export async function updateAppState(recipe: (current: AppState) => AppState): Promise<AppState> {
  try {
    const current = await loadAppState();
    const next = recipe(current);
    return await saveAppState(next);
  } catch (error) {
    console.error("Failed to update AppState", error);
    throw new Error("Update failed");
  }
}
