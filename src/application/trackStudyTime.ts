import type { Clock, ProgressRepository } from "@/domain/ports";
import { toDayStr } from "@/domain/policies/streak";

/** Acumula segundos de estudo no dia atual (alimenta o cronômetro e o streak). */
export class TrackStudyTime {
  constructor(private readonly deps: { progress: ProgressRepository; clock?: Clock }) {}

  async addSeconds(userId: string, seconds: number): Promise<void> {
    if (seconds <= 0) return;
    const now = this.deps.clock?.now() ?? new Date();
    const day = toDayStr(now);
    const prog = await this.deps.progress.load(userId);
    prog.studyByDate[day] = (prog.studyByDate[day] ?? 0) + Math.round(seconds);
    await this.deps.progress.save(userId, prog);
  }
}
