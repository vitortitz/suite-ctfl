import type { ChapterId, Question } from "../types";
import type { Rng } from "../ports";
import { shuffle } from "../random";

/** Distribuição oficial de questões por capítulo no exame CTFL v4.0 (total 40). */
export const EXAM_DISTRIBUTION: Record<ChapterId, number> = { 1: 8, 2: 6, 3: 4, 4: 11, 5: 9, 6: 2 };
export const EXAM_TOTAL = 40;
export const EXAM_DURATION_SEC = 60 * 60;
export const PASS_PERCENT = 65;

export function isPass(pct: number): boolean {
  return pct >= PASS_PERCENT;
}

/**
 * Seleciona as questões do exame respeitando a distribuição por capítulo.
 * Se um capítulo não tiver questões suficientes, usa todas as disponíveis.
 */
export function selectExamQuestions(questions: Question[], rng: Rng = Math.random): Question[] {
  const picked: Question[] = [];
  for (const key of Object.keys(EXAM_DISTRIBUTION)) {
    const chapter = Number(key) as ChapterId;
    const want = EXAM_DISTRIBUTION[chapter];
    const pool = shuffle(questions.filter((q) => q.chapter === chapter), rng);
    picked.push(...pool.slice(0, want));
  }
  return shuffle(picked, rng);
}
