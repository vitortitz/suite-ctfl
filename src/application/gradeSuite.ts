import type { Attempt, AttemptItem, Suite } from "@/domain/types";
import type { Clock, ProgressRepository } from "@/domain/ports";
import { gradeItems } from "@/domain/policies/scoring";
import { toDayStr } from "@/domain/policies/streak";

export interface GradeOutput {
  attempt: Attempt;
}

/** Corrige uma suíte, persiste a tentativa e atualiza o progresso do usuário. */
export class GradeSuite {
  constructor(private readonly deps: { progress: ProgressRepository; clock?: Clock }) {}

  async execute(userId: string, suite: Suite, answers: (number | null)[], durationSec: number): Promise<GradeOutput> {
    const now = this.deps.clock?.now() ?? new Date();
    const items: AttemptItem[] = suite.questions.map((sq, i) => {
      const chosen = answers[i] ?? null;
      return {
        questionId: sq.question.id,
        chapter: sq.question.chapter,
        chosenPosition: chosen,
        correct: chosen !== null && chosen === sq.correctPosition,
      };
    });
    const g = gradeItems(items);
    const attempt: Attempt = {
      id: `a-${now.getTime()}`,
      mode: suite.mode,
      dateISO: now.toISOString(),
      day: toDayStr(now),
      total: g.total,
      correct: g.correct,
      pct: g.pct,
      durationSec,
      items,
    };
    const prog = await this.deps.progress.load(userId);
    prog.attempts.push(attempt);
    if (prog.attempts.length > 200) prog.attempts = prog.attempts.slice(-200);
    if (suite.mode === "exam") prog.examBestPct = Math.max(prog.examBestPct, g.pct);
    prog.studyByDate[attempt.day] ??= 0;
    await this.deps.progress.save(userId, prog);
    return { attempt };
  }
}
