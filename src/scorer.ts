import type { Finding, Report } from "./types.js";

const WEIGHT = { error: 15, warn: 5, info: 2 } as const;
const CAP_PER_RULE = 30;

export function score(findings: Finding[]): { score: number; grade: Report["grade"] } {
  const perRule = new Map<string, number>();
  for (const f of findings) {
    const add = WEIGHT[f.severity];
    perRule.set(f.ruleId, Math.min(CAP_PER_RULE, (perRule.get(f.ruleId) ?? 0) + add));
  }
  let total = 0;
  for (const v of perRule.values()) total += v;
  const s = Math.max(0, 100 - total);
  const grade = s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F";
  return { score: s, grade };
}
