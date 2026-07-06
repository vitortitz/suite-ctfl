import type { ChapterId, Suite } from "@/domain/types";
import type { ProgressRepository, QuestionSource, Rng } from "@/domain/ports";
import { buildReinforcement } from "@/domain/services/reinforcement";
import { buildSuite } from "@/domain/services/suite";

/** Monta uma suíte de reforço priorizando os pontos fracos do usuário. */
export class BuildReinforcementSuite {
  constructor(private readonly deps: { questions: QuestionSource; progress: ProgressRepository; rng?: Rng }) {}

  async execute(userId: string, size = 15): Promise<Suite> {
    const rng = this.deps.rng ?? Math.random;
    const prog = await this.deps.progress.load(userId);
    const picked = buildReinforcement(this.deps.questions.all(), prog.attempts, size, rng);
    const chapters = [...new Set(picked.map((q) => q.chapter))].sort((a, b) => a - b) as ChapterId[];
    return buildSuite(picked, "reinforcement", chapters, rng);
  }
}
