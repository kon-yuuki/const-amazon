import type { SubscriptionItem } from "@/types/domain";

const AVERAGE_DAYS_PER_MONTH = 30.4375;

export type MonthlyNormalizedItem = {
  id: string;
  name: string;
  quantity: number;
  priceYen: number;
  frequencyUnit: "week" | "month";
  frequencyInterval: number;
  monthlyCostYen: number;
};

function monthlyFactor(item: SubscriptionItem) {
  if (item.frequencyUnit === "month") {
    return 1 / item.frequencyInterval;
  }
  return AVERAGE_DAYS_PER_MONTH / (7 * item.frequencyInterval);
}

export function calculateMonthlyCostOfItem(item: SubscriptionItem) {
  return item.priceYen * item.quantity * monthlyFactor(item);
}

export function calculateMonthlyFixedCost(items: SubscriptionItem[]) {
  return items.reduce((sum, item) => sum + calculateMonthlyCostOfItem(item), 0);
}

export function calculateYearlyFixedCost(items: SubscriptionItem[]) {
  return calculateMonthlyFixedCost(items) * 12;
}

export function toMonthlyNormalizedItems(items: SubscriptionItem[]): MonthlyNormalizedItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    priceYen: item.priceYen,
    frequencyUnit: item.frequencyUnit,
    frequencyInterval: item.frequencyInterval,
    monthlyCostYen: calculateMonthlyCostOfItem(item),
  }));
}
