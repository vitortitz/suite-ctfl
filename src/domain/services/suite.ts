import type { ChapterId, Question, Suite, SuiteMode, SuiteQuestion } from "../types";
import type { Rng } from "../ports";
import { shuffle } from "../random";

/** Embaralha as alternativas de uma questão e registra onde ficou a correta. */
export function toSuiteQuestion(q: Question, rng: Rng = Math.random): SuiteQuestion {
  const order = shuffle(
    q.options.map((_, i) => i),
    rng,
  );
  return { question: q, order, correctPosition: order.indexOf(q.answerIndex) };
}

export function buildSuite(
  questions: Question[],
  mode: SuiteMode,
  chapterIds: ChapterId[],
  rng: Rng = Math.random,
  durationSec?: number,
): Suite {
  return {
    mode,
    chapterIds,
    durationSec,
    questions: questions.map((q) => toSuiteQuestion(q, rng)),
  };
}
