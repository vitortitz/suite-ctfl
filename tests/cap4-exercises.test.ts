import { describe, it, expect } from "vitest";
import { generateBoundary, generateDecision, generateEquivalence, generateStateTransition, randomExercise } from "@/domain/services/cap4-exercises";
import { seededRng } from "@/domain/random";

describe("Cap4Exercises", () => {
  it("valida o particionamento de equivalência", () => {
    const ex = generateEquivalence(seededRng(1));
    expect(ex.validate(ex.answerLabel)).toBe(true);
    expect(ex.validate("99")).toBe(false);
  });

  it("valida a análise de valor limite (2 ou 3 valores) ignorando ordem e espaços", () => {
    for (let s = 0; s < 20; s++) {
      const ex = generateBoundary(seededRng(s + 1));
      const parts = ex.answerLabel.split(", ");
      expect([4, 6]).toContain(parts.length); // 2 valores → 4; 3 valores → 6
      const shuffled = [...parts].reverse().join(" ,  ");
      expect(ex.validate(shuffled)).toBe(true);
      expect(ex.validate("1, 2, 3")).toBe(false);
    }
  });

  it("valida o número de colunas da tabela de decisão (2^n)", () => {
    const ex = generateDecision(seededRng(3));
    expect(ex.validate(ex.answerLabel)).toBe(true);
    expect(ex.validate("3")).toBe(false);
  });

  it("valida o exercício de transição de estados (total/inválidas)", () => {
    for (let s = 0; s < 20; s++) {
      const ex = generateStateTransition(seededRng(s + 1));
      expect(ex.kind).toBe("stateTransition");
      expect(ex.validate(ex.answerLabel)).toBe(true);
      expect(ex.validate("-1")).toBe(false);
    }
  });

  it("randomExercise sempre retorna um exercício válido e autoconsistente", () => {
    for (let s = 0; s < 30; s++) {
      const ex = randomExercise(seededRng(s + 10));
      expect(ex.validate(ex.answerLabel)).toBe(true);
    }
  });

  it("gera variantes avançadas (difíceis) e todas são autoconsistentes", () => {
    const collect = (gen: (r: ReturnType<typeof seededRng>) => { prompt: string; answerLabel: string; validate: (s: string) => boolean }) => {
      const prompts: string[] = [];
      for (let s = 0; s < 60; s++) {
        const ex = gen(seededRng(s * 7 + 3));
        expect(ex.validate(ex.answerLabel)).toBe(true); // autoconsistente
        prompts.push(ex.prompt);
      }
      return prompts.join(" ");
    };
    // cada técnica deve produzir, em algum momento, sua variante avançada
    expect(collect(generateEquivalence)).toContain("mínimo"); // multicampo → máx(m,n)
    expect(collect(generateBoundary)).toContain("estritamente"); // limites mistos
    expect(collect(generateDecision)).toContain("don't-care"); // colapso de regras
    expect(collect(generateStateTransition)).toContain("1-switch"); // pares de transições
  });
});
