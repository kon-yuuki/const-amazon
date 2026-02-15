"use client";

const IMPORT_DRAFT_KEY = "const_import_draft_items_v1";

export type ImportDraftItem = {
  name: string;
  quantity: number;
  priceYen: number;
  frequencyUnit: "week" | "month";
  frequencyInterval: number;
};

export function saveImportDraft(items: ImportDraftItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(items));
}

export function loadImportDraft(): ImportDraftItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = sessionStorage.getItem(IMPORT_DRAFT_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ImportDraftItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearImportDraft() {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(IMPORT_DRAFT_KEY);
}
