import type { AttemptItem, ChapterId, ChapterScore, GradeResult } from "../types";
import { isPass, PASS_PERCENT } from "./exam";

export { isPass, PASS_PERCENT };

/** Calcula acerto total, percentual e desempenho por capítulo. */
export function gradeItems(items: AttemptItem[]): GradeResult {
  const total = items.length;
  const correct = items.filter((i) => i.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  const perChapter: Partial<Record<ChapterId, ChapterScore>> = {};
  for (const it of items) {
    const c = (perChapter[it.chapter] ??= { total: 0, correct: 0, pct: 0 });
    c.total++;
    if (it.correct) c.correct++;
  }
  for (const key of Object.keys(perChapter)) {
    const c = perChapter[Number(key) as ChapterId]!;
    c.pct = c.total ? Math.round((c.correct / c.total) * 100) : 0;
  }
  return { total, correct, pct, perChapter };
}
