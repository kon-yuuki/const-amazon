import { describe, expect, it } from "vitest";

import { applyEqualSplit, calculateShares, ratioTotal, validateRatio } from "@/lib/household/split";
import type { HouseholdMember } from "@/types/domain";

describe("household split", () => {
  const members: HouseholdMember[] = [
    { id: "1", name: "A", ratioPercent: 60 },
    { id: "2", name: "B", ratioPercent: 40 },
  ];

  it("validates ratio total=100", () => {
    expect(ratioTotal(members)).toBe(100);
    expect(validateRatio(members)).toBe(true);
  });

  it("applies equal split", () => {
    const equal = applyEqualSplit(members);
    expect(equal[0].ratioPercent + equal[1].ratioPercent).toBe(100);
  });

  it("calculates yen shares", () => {
    const shares = calculateShares(10000, members);
    expect(shares[0].shareYen).toBe(6000);
    expect(shares[1].shareYen).toBe(4000);
  });
});
