import { describe, it, expect } from "vitest";
import { buildReinforcement, computeStats, weightFor } from "@/domain/services/reinforcement";
import { seededRng } from "@/domain/random";
import type { Attempt, Question } from "@/domain/types";

const q = (id: string): Question => ({ id, chapter: 1, prompt: "", options: ["a", "b"], answerIndex: 0, explanation: "" });

const attempt = (results: Array<[string, boolean]>): Attempt => ({
  id: "a1",
  mode: "study",
  dateISO: "",
  day: "2026-07-05",
  total: results.length,
  correct: results.filter(([, c]) => c).length,
  pct: 0,
  durationSec: 0,
  items: results.map(([id, correct]) => ({ questionId: id, chapter: 1, chosenPosition: 0, correct })),
});

describe("ReinforcementSelector", () => {
  it("dá peso alto a questões nunca vistas e a erros; baixo a acertos consistentes", () => {
    const stats = computeStats([attempt([["seenWrong", false], ["seenRight", true]])]);
    expect(weightFor(q("neverSeen"), stats)).toBeGreaterThan(weightFor(q("seenRight"), stats));
    expect(weightFor(q("seenWrong"), stats)).toBeGreaterThan(weightFor(q("seenRight"), stats));
  });

  it("prioriza pontos fracos ao montar a suíte de reforço", () => {
    const questions = [q("weak"), q("strong")];
    const attempts = [
      attempt([["weak", false]]),
      attempt([["weak", false]]),
      attempt([["strong", true]]),
      attempt([["strong", true]]),
      attempt([["strong", true]]),
    ];
    let weakFirst = 0;
    for (let s = 0; s < 40; s++) {
      const picked = buildReinforcement(questions, attempts, 1, seededRng(s + 1));
      if (picked[0]?.id === "weak") weakFirst++;
    }
    expect(weakFirst).toBeGreaterThan(28); // maioria clara
  });
});
