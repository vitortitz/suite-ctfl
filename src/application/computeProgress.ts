import type { Attempt, ChapterId } from "@/domain/types";
import type { Clock, ProgressRepository } from "@/domain/ports";
import { computeStreak, toDayStr } from "@/domain/policies/streak";
import { CHAPTER_IDS } from "@/domain/chapters";

export interface ChapterMastery {
  chapter: ChapterId;
  seen: number;
  correct: number;
  pct: number;
}
export interface ActivityDay {
  day: string;
  seconds: number;
  active: boolean;
}
export interface ProgressDashboard {
  streak: number;
  totalStudySec: number;
  todayStudySec: number;
  attempts: number;
  examBestPct: number;
  mastery: ChapterMastery[];
  recent: Attempt[];
  last14: ActivityDay[];
}

/** Deriva o painel de progresso (streak, tempo, domínio por capítulo, atividade). */
export class ComputeProgress {
  constructor(private readonly deps: { progress: ProgressRepository; clock?: Clock }) {}

  async execute(userId: string): Promise<ProgressDashboard> {
    const now = this.deps.clock?.now() ?? new Date();
    const today = toDayStr(now);
    const prog = await this.deps.progress.load(userId);

    const activeDays = new Set<string>([
      ...Object.keys(prog.studyByDate).filter((d) => prog.studyByDate[d] > 0),
      ...prog.attempts.map((a) => a.day),
    ]);
    const streak = computeStreak(activeDays, today);
    const totalStudySec = Object.values(prog.studyByDate).reduce((s, n) => s + n, 0);
    const todayStudySec = prog.studyByDate[today] ?? 0;

    const agg = new Map<ChapterId, { seen: number; correct: number }>();
    for (const a of prog.attempts) {
      for (const it of a.items) {
        const m = agg.get(it.chapter) ?? { seen: 0, correct: 0 };
        m.seen++;
        if (it.correct) m.correct++;
        agg.set(it.chapter, m);
      }
    }
    const mastery: ChapterMastery[] = CHAPTER_IDS.map((ch) => {
      const m = agg.get(ch) ?? { seen: 0, correct: 0 };
      return { chapter: ch, seen: m.seen, correct: m.correct, pct: m.seen ? Math.round((m.correct / m.seen) * 100) : 0 };
    });

    const last14: ActivityDay[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day = toDayStr(d);
      last14.push({ day, seconds: prog.studyByDate[day] ?? 0, active: activeDays.has(day) });
    }
    const recent = prog.attempts.slice(-8).reverse();

    return { streak, totalStudySec, todayStudySec, attempts: prog.attempts.length, examBestPct: prog.examBestPct, mastery, recent, last14 };
  }
}
