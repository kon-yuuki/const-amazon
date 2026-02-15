import { APP_SCHEMA_VERSION, type AppState, type HouseholdMember } from "@/types/domain";
import { createDefaultState } from "@/lib/state/defaults";

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function normalizeMembers(value: unknown): HouseholdMember[] {
  if (!Array.isArray(value)) {
    return createDefaultState().members;
  }

  const members = value
    .filter((entry) => isObject(entry))
    .map((entry, index) => {
      const name = typeof entry.name === "string" && entry.name.trim().length > 0 ? entry.name : `Member ${index + 1}`;
      const ratio = typeof entry.ratioPercent === "number" ? entry.ratioPercent : 0;
      return {
        id: typeof entry.id === "string" ? entry.id : `member-${index + 1}`,
        name,
        ratioPercent: ratio,
      };
    });

  if (members.length === 0) {
    return createDefaultState().members;
  }

  const total = members.reduce((sum, member) => sum + member.ratioPercent, 0);
  if (total <= 0) {
    const equal = 100 / members.length;
    return members.map((member) => ({ ...member, ratioPercent: equal }));
  }

  return members;
}

function normalizeItems(value: unknown): AppState["items"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: typeof entry.id === "string" ? entry.id : `item-${index + 1}`,
      name: typeof entry.name === "string" ? entry.name : "",
      quantity: typeof entry.quantity === "number" && entry.quantity > 0 ? entry.quantity : 1,
      priceYen: typeof entry.priceYen === "number" && entry.priceYen >= 0 ? entry.priceYen : 0,
      frequencyUnit: entry.frequencyUnit === "week" ? "week" : "month",
      frequencyInterval:
        typeof entry.frequencyInterval === "number" && entry.frequencyInterval > 0
          ? entry.frequencyInterval
          : 1,
    }));
}

export function migrateToLatest(input: unknown): AppState {
  const defaults = createDefaultState();

  if (!isObject(input)) {
    return defaults;
  }

  const schemaVersion = typeof input.schemaVersion === "number" ? input.schemaVersion : 0;

  // v0 compatibility: no schemaVersion, partial keys may exist
  if (schemaVersion <= 0) {
    return {
      ...defaults,
      items: normalizeItems(input.items),
      members: normalizeMembers(input.members),
      settings: isObject(input.settings)
        ? {
            splitMode: input.settings.splitMode === "ratio" ? "ratio" : "equal",
            monthsToForecast:
              typeof input.settings.monthsToForecast === "number" ? input.settings.monthsToForecast : defaults.settings.monthsToForecast,
          }
        : defaults.settings,
      schemaVersion: APP_SCHEMA_VERSION,
      updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : defaults.updatedAt,
    };
  }

  // current/latest schema
  return {
    ...defaults,
    ...input,
    schemaVersion: APP_SCHEMA_VERSION,
    items: normalizeItems((input as UnknownRecord).items),
    members: normalizeMembers((input as UnknownRecord).members),
  } as AppState;
}
