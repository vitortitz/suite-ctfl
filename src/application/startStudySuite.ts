import type { ChapterId, Suite } from "@/domain/types";
import type { QuestionSource, Rng } from "@/domain/ports";
import { shuffle } from "@/domain/random";
import { buildSuite } from "@/domain/services/suite";

/** Monta uma suíte de estudo (feedback imediato) para os capítulos escolhidos. */
export class StartStudySuite {
  constructor(private readonly deps: { questions: QuestionSource; rng?: Rng }) {}

  execute(chapterIds: ChapterId[], size: number): Suite {
    const rng = this.deps.rng ?? Math.random;
    const pool = this.deps.questions.all().filter((q) => chapterIds.includes(q.chapter));
    const picked = shuffle(pool, rng).slice(0, Math.min(size, pool.length));
    return buildSuite(picked, "study", chapterIds, rng);
  }
}
