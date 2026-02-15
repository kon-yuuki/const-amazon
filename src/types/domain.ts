export const APP_SCHEMA_VERSION = 2 as const;

export type DeliveryFrequencyUnit = "week" | "month";

export type SubscriptionItem = {
  id: string;
  name: string;
  quantity: number;
  priceYen: number;
  frequencyUnit: DeliveryFrequencyUnit;
  frequencyInterval: number;
};

export type HouseholdMember = {
  id: string;
  name: string;
  ratioPercent: number;
};

export type SplitMode = "equal" | "ratio";

export type AppSettings = {
  splitMode: SplitMode;
  monthsToForecast: number;
};

export type AppState = {
  schemaVersion: number;
  items: SubscriptionItem[];
  members: HouseholdMember[];
  settings: AppSettings;
  updatedAt: string;
};
