import type { Suite } from "@/domain/types";
import type { QuestionSource, Rng } from "@/domain/ports";
import { EXAM_DURATION_SEC, selectExamQuestions } from "@/domain/policies/exam";
import { CHAPTER_IDS } from "@/domain/chapters";
import { buildSuite } from "@/domain/services/suite";

/** Monta o exame oficial: 40 questões na distribuição 8/6/4/11/9/2, 60 minutos, sem feedback. */
export class StartExam {
  constructor(private readonly deps: { questions: QuestionSource; rng?: Rng }) {}

  execute(): Suite {
    const rng = this.deps.rng ?? Math.random;
    const picked = selectExamQuestions(this.deps.questions.all(), rng);
    return buildSuite(picked, "exam", CHAPTER_IDS, rng, EXAM_DURATION_SEC);
  }
}
