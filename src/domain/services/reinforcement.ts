import type { Attempt, Question } from "../types";
import type { Rng } from "../ports";
import { weightedSample } from "../random";

export interface QuestionStat {
  seen: number;
  wrong: number;
  correct: number;
}

/** Agrega, por questão, quantas vezes foi vista/errada/acertada em tentativas passadas. */
export function computeStats(attempts: Attempt[]): Map<string, QuestionStat> {
  const m = new Map<string, QuestionStat>();
  for (const a of attempts) {
    for (const it of a.items) {
      const s = m.get(it.questionId) ?? { seen: 0, wrong: 0, correct: 0 };
      s.seen++;
      if (it.correct) s.correct++;
      else s.wrong++;
      m.set(it.questionId, s);
    }
  }
  return m;
}

/** Peso de reforço: nunca vista = alta; erros aumentam; acertos reduzem (piso 0.25). */
export function weightFor(q: Question, stats: Map<string, QuestionStat>): number {
  const s = stats.get(q.id);
  if (!s || s.seen === 0) return 3;
  return Math.max(0.25, 1 + s.wrong * 2 - s.correct * 0.4);
}

/** Monta uma suíte de reforço priorizando pontos fracos e questões não vistas. */
export function buildReinforcement(questions: Question[], attempts: Attempt[], size = 15, rng: Rng = Math.random): Question[] {
  const stats = computeStats(attempts);
  return weightedSample(questions, (q) => weightFor(q, stats), size, rng);
}
