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

const intEq = (input: string, expected: number): boolean => Number.parseInt(input.trim(), 10) === expected;

/**
 * Particionamento de equivalência. Sorteia entre a versão básica (contar partições)
 * e a versão avançada (nº mínimo de casos para cobrir dois campos — a pegadinha do
 * "máximo, não soma nem produto").
 */
export function generateEquivalence(rng: Rng = Math.random): Exercise {
  if (rng() < 0.5) return equivalenceMultiField(rng);
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
    validate: (input) => intEq(input, partitions),
  };
}

/** Avançado: cobrir todas as partições válidas de dois campos → máx(m, n). */
function equivalenceMultiField(rng: Rng): Exercise {
  const m = randInt(rng, 2, 4);
  const n = randInt(rng, 2, 4);
  const answer = Math.max(m, n);
  return {
    kind: "equivalence",
    prompt: `Um formulário tem dois campos independentes: <b>Perfil</b>, com <b>${m}</b> partições de equivalência válidas, e <b>Faixa de renda</b>, com <b>${n}</b>.<br>Qual é o número <b>mínimo</b> de casos de teste para cobrir todas as partições <b>válidas</b> de ambos os campos?`,
    explanation: `Cada caso de teste informa um valor para cada campo, cobrindo uma partição de cada por vez. Para cobrir todas, bastam <b>máx(${m}, ${n}) = ${answer}</b> casos — não a soma (${m + n}) nem o produto (${m * n}).`,
    answerLabel: String(answer),
    validate: (input) => intEq(input, answer),
  };
}

/**
 * Análise de valor limite (BVA). Alterna entre as duas versões do syllabus v4.0:
 * - 2 valores: o limite e o vizinho da partição adjacente.
 * - 3 valores: o limite e os dois vizinhos.
 */
const matchSet = (input: string, expected: number[]): boolean => {
  const nums = input
    .split(/[,\s]+/)
    .map((x) => Number.parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
  const got = new Set(nums);
  return got.size === expected.length && expected.every((v) => got.has(v));
};

export function generateBoundary(rng: Rng = Math.random): Exercise {
  if (rng() < 0.5) return boundaryMixed(rng);
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
    validate: (input) => matchSet(input, expected),
  };
}

/**
 * Avançado: limites mistos (estrito × inclusivo). Exige converter "> a" e "< b"
 * para o primeiro/último valor realmente válido antes de aplicar a BVA de 2 valores.
 */
function boundaryMixed(rng: Rng): Exercise {
  const lo = randInt(rng, 5, 50);
  const hi = lo + randInt(rng, 15, 40);
  const lowerStrict = rng() < 0.5; // "> lo" em vez de ">= lo"
  const upperStrict = rng() < 0.5; // "< hi" em vez de "<= hi"
  // Par de valores-limite (valor de fronteira + vizinho externo) em cada extremo.
  const lowerPair = lowerStrict ? [lo, lo + 1] : [lo - 1, lo];
  const upperPair = upperStrict ? [hi - 1, hi] : [hi, hi + 1];
  const expected = [...lowerPair, ...upperPair];
  const lowerTxt = lowerStrict ? `estritamente maiores que <b>${lo}</b>` : `maiores ou iguais a <b>${lo}</b>`;
  const upperTxt = upperStrict ? `estritamente menores que <b>${hi}</b>` : `menores ou iguais a <b>${hi}</b>`;
  return {
    kind: "boundary",
    prompt: `Um campo aceita valores inteiros ${lowerTxt} e ${upperTxt}.<br>Digite os valores da análise de valor limite (<b>2 valores</b>), separados por vírgula.`,
    explanation: `Com limites mistos, primeiro ache o valor válido de fronteira em cada extremo: ${
      lowerStrict ? `como é "> ${lo}", o primeiro válido é ${lo + 1} e o último inválido é ${lo}` : `como é "≥ ${lo}", o primeiro válido é ${lo} e o último inválido é ${lo - 1}`
    }; ${
      upperStrict ? `como é "< ${hi}", o último válido é ${hi - 1} e o primeiro inválido é ${hi}` : `como é "≤ ${hi}", o último válido é ${hi} e o primeiro inválido é ${hi + 1}`
    }. Valores da BVA de 2 valores: <b>${expected.join(", ")}</b>.`,
    answerLabel: expected.join(", "),
    validate: (input) => matchSet(input, expected),
  };
}

/**
 * Tabela de decisão. Sorteia entre a versão básica (2^n colunas) e a avançada
 * (consolidação de regras "don't-care" quando uma condição torna as demais
 * irrelevantes) — um cálculo que costuma derrubar os candidatos.
 */
export function generateDecision(rng: Rng = Math.random): Exercise {
  if (rng() < 0.5) return decisionDontCare(rng);
  const n = randInt(rng, 2, 4);
  const cols = 2 ** n;
  return {
    kind: "decision",
    prompt: `Uma tabela de decisão tem <b>${n} condições</b> booleanas independentes.<br>Quantas colunas (regras) tem a tabela completa?`,
    explanation: `Cada condição dobra as combinações: <b>2^${n} = ${cols}</b> colunas.`,
    answerLabel: String(cols),
    validate: (input) => intEq(input, cols),
  };
}

/** Avançado: quando a Condição 1 é falsa, a ação independe das demais → colapsa. */
function decisionDontCare(rng: Rng): Exercise {
  const n = randInt(rng, 3, 4);
  const active = 2 ** (n - 1); // regras com Condição 1 verdadeira (todas distintas)
  const answer = active + 1; // + 1 regra "don't-care" para Condição 1 falsa
  return {
    kind: "decision",
    prompt: `Uma tabela de decisão tem <b>${n} condições</b> booleanas. Quando a <b>Condição 1 é FALSA</b>, a ação é sempre a mesma, independentemente das demais condições.<br>Quantas regras tem a tabela após consolidar as combinações "não importa" (don't-care)?`,
    explanation: `A tabela completa teria 2^${n} = ${2 ** n} regras. Com a Condição 1 verdadeira há 2^${n - 1} = <b>${active}</b> regras distintas; com a Condição 1 falsa, as 2^${n - 1} combinações colapsam em <b>1</b> regra don't-care. Total: ${active} + 1 = <b>${answer}</b>.`,
    answerLabel: String(answer),
    validate: (input) => intEq(input, answer),
  };
}

/**
 * Transição de estados: numa tabela de estados, cada estado é cruzado com cada
 * evento, então o total de transições (válidas + inválidas) é estados × eventos.
 * Alterna entre pedir o total da tabela e o número de transições válidas.
 */
export function generateStateTransition(rng: Rng = Math.random): Exercise {
  if (rng() < 0.4) return stateSwitch1(rng);
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
      validate: (input) => intEq(input, total),
    };
  }
  const invalid = total - valid;
  return {
    kind: "stateTransition",
    prompt: `Uma máquina de estados finitos tem <b>${states} estados</b> e <b>${events} eventos</b>. O diagrama modela <b>${valid} transições válidas</b>.<br>Quantas transições <b>inválidas</b> a tabela de estados completa contém?`,
    explanation: `A tabela completa tem ${states} × ${events} = <b>${total}</b> células. Descontando as ${valid} transições válidas, sobram <b>${total} − ${valid} = ${invalid}</b> transições inválidas.`,
    answerLabel: String(invalid),
    validate: (input) => intEq(input, invalid),
  };
}

/** Avançado: cobertura de 1-switch (pares de transições) numa máquina regular. */
function stateSwitch1(rng: Rng): Exercise {
  const states = randInt(rng, 3, 5);
  const d = randInt(rng, 2, 3);
  const transitions = states * d;
  const answer = transitions * d; // cada transição é seguida por d transições do destino
  return {
    kind: "stateTransition",
    prompt: `Numa máquina de estados, cada um dos <b>${states} estados</b> tem exatamente <b>${d} transições válidas de saída</b>.<br>Quantas sequências de duas transições (pares — cobertura de <b>1-switch</b>) existem no total?`,
    explanation: `Há ${states} × ${d} = ${transitions} transições. Cada uma pode ser seguida por ${d} transições do estado de destino, então os pares são ${transitions} × ${d} = <b>${answer}</b> (cobertura de 1-switch, ou N-switch com N = 1).`,
    answerLabel: String(answer),
    validate: (input) => intEq(input, answer),
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
