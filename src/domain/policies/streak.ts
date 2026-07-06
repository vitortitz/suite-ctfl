/** Cálculo de sequência de dias de estudo (streak). */

export function toDayStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Conta dias consecutivos de atividade terminando em `today`.
 * Dá "carência" para o dia atual: se hoje ainda não teve atividade mas ontem teve,
 * a sequência continua contando a partir de ontem.
 */
export function computeStreak(activeDays: Iterable<string>, today: string): number {
  const set = new Set(activeDays);
  const [Y, M, D] = today.split("-").map(Number);
  const cursor = new Date(Y, M - 1, D);
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(toDayStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
