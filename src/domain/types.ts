/** Tipos centrais do domínio. Sem dependências externas. */

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6;

export interface Chapter {
  id: ChapterId;
  name: string;
  color: string;
  /** Número de questões que este capítulo tem no exame oficial (total 40). */
  examWeight: number;
}

export interface Question {
  id: string;
  chapter: ChapterId;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export type SuiteMode = "study" | "exam" | "reinforcement";

/** Uma questão com as alternativas embaralhadas para exibição. */
export interface SuiteQuestion {
  question: Question;
  /** order[i] = índice da alternativa original exibida na posição i */
  order: number[];
  /** posição, dentro de `order`, que contém a alternativa correta */
  correctPosition: number;
}

export interface Suite {
  mode: SuiteMode;
  chapterIds: ChapterId[];
  questions: SuiteQuestion[];
  durationSec?: number;
}

export interface AttemptItem {
  questionId: string;
  chapter: ChapterId;
  /** posição escolhida (em SuiteQuestion.order) ou null se não respondida */
  chosenPosition: number | null;
  correct: boolean;
}

export interface Attempt {
  id: string;
  mode: SuiteMode;
  dateISO: string;
  /** dia local no formato YYYY-MM-DD (usado para streak e histórico) */
  day: string;
  total: number;
  correct: number;
  pct: number;
  durationSec: number;
  items: AttemptItem[];
}

export interface Progress {
  attempts: Attempt[];
  /** segundos de estudo por dia (YYYY-MM-DD) */
  studyByDate: Record<string, number>;
  examBestPct: number;
  exercises: { done: number; correct: number };
}

export function emptyProgress(): Progress {
  return { attempts: [], studyByDate: {}, examBestPct: 0, exercises: { done: 0, correct: 0 } };
}

export interface ChapterScore {
  total: number;
  correct: number;
  pct: number;
}

export interface GradeResult {
  total: number;
  correct: number;
  pct: number;
  perChapter: Partial<Record<ChapterId, ChapterScore>>;
}

export type SocialProvider = "google" | "github";

export interface User {
  id: string;
  name: string;
  email: string | null;
  provider: "local" | "email" | SocialProvider;
}
