import { describe, it, expect } from "vitest";
import { computeStreak, toDayStr } from "@/domain/policies/streak";

describe("StreakPolicy", () => {
  it("conta dias consecutivos terminando hoje", () => {
    expect(computeStreak(["2026-07-03", "2026-07-04", "2026-07-05"], "2026-07-05")).toBe(3);
  });

  it("dá carência para hoje ainda não estudado se ontem teve atividade", () => {
    expect(computeStreak(["2026-07-03", "2026-07-04"], "2026-07-05")).toBe(2);
  });

  it("zera quando há lacuna", () => {
    expect(computeStreak(["2026-07-01", "2026-07-05"], "2026-07-05")).toBe(1);
    expect(computeStreak(["2026-06-30"], "2026-07-05")).toBe(0);
  });

  it("toDayStr formata data local YYYY-MM-DD", () => {
    expect(toDayStr(new Date(2026, 6, 5))).toBe("2026-07-05");
  });
});
