import type { HouseholdMember } from "@/types/domain";

export function applyEqualSplit(members: HouseholdMember[]): HouseholdMember[] {
  if (members.length === 0) {
    return [];
  }

  const base = Math.floor((10000 / members.length)) / 100;
  const rest = Number((100 - base * (members.length - 1)).toFixed(2));

  return members.map((member, index) => ({
    ...member,
    ratioPercent: index === members.length - 1 ? rest : base,
  }));
}

export function ratioTotal(members: HouseholdMember[]) {
  return Number(members.reduce((sum, member) => sum + member.ratioPercent, 0).toFixed(2));
}

export function validateRatio(members: HouseholdMember[]) {
  return ratioTotal(members) === 100;
}

export function calculateShares(totalYen: number, members: HouseholdMember[]) {
  return members.map((member) => ({
    member,
    shareYen: Math.round((totalYen * member.ratioPercent) / 100),
  }));
}
