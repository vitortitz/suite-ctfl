import { describe, it, expect } from "vitest";
import { gradeItems } from "@/domain/policies/scoring";
import type { AttemptItem } from "@/domain/types";

const item = (chapter: 1 | 4, correct: boolean): AttemptItem => ({
  questionId: "x",
  chapter,
  chosenPosition: correct ? 0 : 1,
  correct,
});

describe("ScoringPolicy", () => {
  it("calcula percentual total e por capítulo", () => {
    const g = gradeItems([item(1, true), item(1, false), item(4, true), item(4, true)]);
    expect(g.total).toBe(4);
    expect(g.correct).toBe(3);
    expect(g.pct).toBe(75);
    expect(g.perChapter[1]).toEqual({ total: 2, correct: 1, pct: 50 });
    expect(g.perChapter[4]).toEqual({ total: 2, correct: 2, pct: 100 });
  });

  it("lida com lista vazia sem quebrar", () => {
    const g = gradeItems([]);
    expect(g.pct).toBe(0);
    expect(g.total).toBe(0);
  });
});
