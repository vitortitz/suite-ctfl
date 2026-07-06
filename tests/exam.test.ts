import { describe, it, expect } from "vitest";
import { EXAM_DISTRIBUTION, EXAM_TOTAL, isPass, selectExamQuestions } from "@/domain/policies/exam";
import { QUESTIONS } from "@/infrastructure/data/questions";
import { seededRng } from "@/domain/random";
import type { ChapterId } from "@/domain/types";

describe("ExamPolicy", () => {
  it("seleciona 40 questões na distribuição oficial por capítulo", () => {
    const picked = selectExamQuestions(QUESTIONS, seededRng(7));
    expect(picked.length).toBe(EXAM_TOTAL);
    const counts: Record<number, number> = {};
    for (const q of picked) counts[q.chapter] = (counts[q.chapter] ?? 0) + 1;
    for (const key of Object.keys(EXAM_DISTRIBUTION)) {
      const ch = Number(key) as ChapterId;
      expect(counts[ch]).toBe(EXAM_DISTRIBUTION[ch]);
    }
  });

  it("não repete questões na mesma prova", () => {
    const picked = selectExamQuestions(QUESTIONS, seededRng(3));
    expect(new Set(picked.map((q) => q.id)).size).toBe(picked.length);
  });

  it("aplica a nota de corte de 65%", () => {
    expect(isPass(65)).toBe(true);
    expect(isPass(64)).toBe(false);
    expect(isPass(100)).toBe(true);
  });
});
