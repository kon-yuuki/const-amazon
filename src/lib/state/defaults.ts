import { APP_SCHEMA_VERSION, type AppState } from "@/types/domain";

function nowIso() {
  return new Date().toISOString();
}

export function createDefaultState(): AppState {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    items: [],
    members: [
      { id: "member-1", name: "メンバー1", ratioPercent: 50 },
      { id: "member-2", name: "メンバー2", ratioPercent: 50 },
    ],
    settings: {
      splitMode: "equal",
      monthsToForecast: 6,
    },
    updatedAt: nowIso(),
  };
}
