import { describe, expect, it } from "vitest";

import {
  calculateMonthlyCostOfItem,
  calculateMonthlyFixedCost,
  calculateYearlyFixedCost,
  toMonthlyNormalizedItems,
} from "@/lib/forecast/calc";
import type { SubscriptionItem } from "@/types/domain";

const sampleItems: SubscriptionItem[] = [
  {
    id: "a",
    name: "Monthly A",
    quantity: 1,
    priceYen: 1000,
    frequencyUnit: "month",
    frequencyInterval: 1,
  },
  {
    id: "b",
    name: "Biweekly B",
    quantity: 2,
    priceYen: 500,
    frequencyUnit: "week",
    frequencyInterval: 2,
  },
];

describe("forecast calculations", () => {
  it("calculates monthly cost for monthly cycle items", () => {
    const cost = calculateMonthlyCostOfItem(sampleItems[0]);
    expect(cost).toBe(1000);
  });

  it("calculates monthly cost for weekly cycle items", () => {
    const cost = calculateMonthlyCostOfItem(sampleItems[1]);
    expect(cost).toBeCloseTo(2174.107142857, 6);
  });

  it("calculates fixed monthly and yearly cost", () => {
    const monthly = calculateMonthlyFixedCost(sampleItems);
    const yearly = calculateYearlyFixedCost(sampleItems);
    expect(monthly).toBeCloseTo(3174.107142857, 6);
    expect(yearly).toBeCloseTo(38089.2857142857, 6);
  });

  it("returns normalized item rows", () => {
    const rows = toMonthlyNormalizedItems(sampleItems);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Monthly A");
    expect(rows[1].monthlyCostYen).toBeCloseTo(2174.107142857, 6);
  });
});
