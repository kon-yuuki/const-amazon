import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import { migrateToLatest } from "@/lib/state/migrations";
import type { AppState } from "@/types/domain";

const SHARE_SCHEMA_VERSION = 1;

type SharePayload = {
  v: number;
  state: AppState;
};

export function encodeShareState(state: AppState) {
  const payload: SharePayload = {
    v: SHARE_SCHEMA_VERSION,
    state,
  };

  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShareState(encoded: string): AppState {
  const decompressed = decompressFromEncodedURIComponent(encoded);
  if (!decompressed) {
    throw new Error("Failed to decode share data.");
  }

  const parsed = JSON.parse(decompressed) as Partial<SharePayload>;
  if (typeof parsed !== "object" || parsed === null || typeof parsed.v !== "number") {
    throw new Error("Invalid share payload format.");
  }

  if (parsed.v !== SHARE_SCHEMA_VERSION) {
    throw new Error(`Unsupported share payload version: ${parsed.v}`);
  }

  return migrateToLatest(parsed.state);
}
