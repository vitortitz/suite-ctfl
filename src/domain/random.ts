import type { Rng } from "./ports";

/** Fisher–Yates. Não muta o array original. */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** Amostragem ponderada sem reposição. Pesos <= 0 caem para uniforme. */
export function weightedSample<T>(items: readonly T[], weight: (t: T) => number, n: number, rng: Rng = Math.random): T[] {
  const pool = items.map((t) => ({ t, w: Math.max(0, weight(t)) }));
  const out: T[] = [];
  const count = Math.min(n, pool.length);
  for (let k = 0; k < count; k++) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let idx = 0;
    if (total <= 0) {
      idx = Math.floor(rng() * pool.length);
    } else {
      let r = rng() * total;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].w;
        idx = i;
        if (r <= 0) break;
      }
    }
    out.push(pool[idx].t);
    pool.splice(idx, 1);
  }
  return out;
}

/** Seeded RNG (mulberry32) para testes determinísticos. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
