import type { Rng } from "../ports";

/** Exercícios interativos de aplicação (nível K3) das técnicas do Capítulo 4. */
export type ExerciseKind = "equivalence" | "boundary" | "decision" | "stateTransition";

export interface Exercise {
  kind: ExerciseKind;
  prompt: string;
  explanation: string;
  /** Resposta correta em texto (mostrada na explicação). */
  answerLabel: string;
  validate(input: string): boolean;
}

function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Particionamento de equivalência: quantas partições existem? */
export function generateEquivalence(rng: Rng = Math.random): Exercise {
  const lo = randInt(rng, 1, 40);
  const hi = lo + randInt(rng, 20, 60);
  const bounded = rng() < 0.6;
  const lowerOnly = rng() < 0.5;
  const partitions = bounded ? 3 : 2;
  const scenario = bounded
    ? `Um campo aceita valores válidos de <b>${lo}</b> a <b>${hi}</b>.`
    : lowerOnly
      ? `Um campo aceita valores <b>maiores ou iguais a ${lo}</b>.`
      : `Um campo aceita valores <b>menores ou iguais a ${hi}</b>.`;
  return {
    kind: "equivalence",
    prompt: `${scenario}<br>Quantas partições de equivalência existem (válidas + inválidas)?`,
    explanation: bounded
      ? `Um intervalo com dois limites gera <b>3 partições</b>: inválida abaixo, válida no meio e inválida acima.`
      : `Com apenas um limite há <b>2 partições</b>: uma válida e uma inválida.`,
    answerLabel: String(partitions),
    validate: (input) => Number.parseInt(input.trim(), 10) === partitions,
  };
}

/**
 * Análise de valor limite (BVA). Alterna entre as duas versões do syllabus v4.0:
 * - 2 valores: o limite e o vizinho da partição adjacente.
 * - 3 valores: o limite e os dois vizinhos.
 */
export function generateBoundary(rng: Rng = Math.random): Exercise {
  const lo = randInt(rng, 5, 50);
  const hi = lo + randInt(rng, 15, 40);
  const threeValue = rng() < 0.5;
  const expected = threeValue
    ? [lo - 1, lo, lo + 1, hi - 1, hi, hi + 1]
    : [lo - 1, lo, hi, hi + 1];
  const versao = threeValue ? "3 valores" : "2 valores";
  return {
    kind: "boundary",
    prompt: `O intervalo válido vai de <b>${lo}</b> a <b>${hi}</b>.<br>Digite os valores da análise de valor limite (<b>${versao}</b>), separados por vírgula.`,
    explanation: threeValue
      ? `No BVA de 3 valores testam-se o limite e os <b>dois</b> vizinhos: <b>${expected.join(", ")}</b>.`
      : `No BVA de 2 valores testam-se o limite e o vizinho de cada lado: <b>${expected.join(", ")}</b>.`,
    answerLabel: expected.join(", "),
    validate: (input) => {
      const nums = input
        .split(/[,\s]+/)
        .map((x) => Number.parseInt(x, 10))
        .filter((n) => !Number.isNaN(n));
      const got = new Set(nums);
      return got.size === expected.length && expected.every((v) => got.has(v));
    },
  };
}

/** Tabela de decisão: quantas colunas (regras) para N condições? */
export function generateDecision(rng: Rng = Math.random): Exercise {
  const n = randInt(rng, 2, 4);
  const cols = 2 ** n;
  return {
    kind: "decision",
    prompt: `Uma tabela de decisão tem <b>${n} condições</b> booleanas independentes.<br>Quantas colunas (regras) tem a tabela completa?`,
    explanation: `Cada condição dobra as combinações: <b>2^${n} = ${cols}</b> colunas.`,
    answerLabel: String(cols),
    validate: (input) => Number.parseInt(input.trim(), 10) === cols,
  };
}

/**
 * Transição de estados: numa tabela de estados, cada estado é cruzado com cada
 * evento, então o total de transições (válidas + inválidas) é estados × eventos.
 * Alterna entre pedir o total da tabela e o número de transições válidas.
 */
export function generateStateTransition(rng: Rng = Math.random): Exercise {
  const states = randInt(rng, 3, 5);
  const events = randInt(rng, 2, 4);
  const total = states * events;
  // Nº de transições válidas modeladas (as demais células da tabela são inválidas).
  const valid = randInt(rng, states, total - 1);
  const askTotal = rng() < 0.5;
  if (askTotal) {
    return {
      kind: "stateTransition",
      prompt: `Uma máquina de estados finitos tem <b>${states} estados</b> e <b>${events} eventos</b> possíveis.<br>Na tabela de estados completa, quantas transições existem (válidas + inválidas)?`,
      explanation: `A tabela de estados cruza cada estado com cada evento: <b>${states} × ${events} = ${total}</b> transições no total (as células inválidas incluídas).`,
      answerLabel: String(total),
      validate: (input) => Number.parseInt(input.trim(), 10) === total,
    };
  }
  const invalid = total - valid;
  return {
    kind: "stateTransition",
    prompt: `Uma máquina de estados finitos tem <b>${states} estados</b> e <b>${events} eventos</b>. O diagrama modela <b>${valid} transições válidas</b>.<br>Quantas transições <b>inválidas</b> a tabela de estados completa contém?`,
    explanation: `A tabela completa tem ${states} × ${events} = <b>${total}</b> células. Descontando as ${valid} transições válidas, sobram <b>${total} − ${valid} = ${invalid}</b> transições inválidas.`,
    answerLabel: String(invalid),
    validate: (input) => Number.parseInt(input.trim(), 10) === invalid,
  };
}

const GENERATORS: Record<ExerciseKind, (rng: Rng) => Exercise> = {
  equivalence: generateEquivalence,
  boundary: generateBoundary,
  decision: generateDecision,
  stateTransition: generateStateTransition,
};

export const EXERCISE_KINDS: ExerciseKind[] = ["equivalence", "boundary", "decision", "stateTransition"];

export const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  equivalence: "Particionamento de equivalência",
  boundary: "Análise de valor limite",
  decision: "Tabela de decisão",
  stateTransition: "Transição de estados",
};

export function generateExercise(kind: ExerciseKind, rng: Rng = Math.random): Exercise {
  return GENERATORS[kind](rng);
}

export function randomExercise(rng: Rng = Math.random): Exercise {
  const kind = EXERCISE_KINDS[Math.floor(rng() * EXERCISE_KINDS.length)];
  return generateExercise(kind, rng);
}
