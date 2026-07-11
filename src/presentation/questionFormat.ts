/**
 * Estruturação visual de enunciados de questões.
 *
 * O `prompt` do banco é HTML confiável (contém apenas <b>/<i> internos). Muitas
 * questões — combinações, verdadeiro/falso, cenários com vários pontos numerados
 * e tuplas de caso de teste — vêm num único parágrafo denso, difícil de ler.
 * `formatPrompt` separa a pergunta do contexto e transforma essas enumerações em
 * listas legíveis. Quando nenhum padrão é reconhecido, devolve o texto como um
 * único enunciado — nunca pior que o original.
 */

interface Item {
  label: string;
  text: string;
}

/** Divide um trecho pelos marcadores de uma família (ex.: "1- ", "(a)"). */
function splitByMarkers(text: string, re: RegExp): Item[] {
  const matches = [...text.matchAll(re)];
  return matches.map((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const body = text
      .slice(start, end)
      .trim()
      .replace(/[;.]\s*$/, "")
      .trim();
    return { label: m[1], text: body };
  });
}

/** Separa a pergunta final (que termina em "?") do contexto que a precede. */
function extractAsk(text: string): { ctx: string; ask: string } {
  const t = text.trim();
  const q = t.lastIndexOf("?");
  if (q !== t.length - 1) return { ctx: t, ask: "" };
  const head = t.slice(0, q);
  const boundary = Math.max(
    head.lastIndexOf(". "),
    head.lastIndexOf("; "),
    head.lastIndexOf(": "),
  );
  const start = boundary === -1 ? 0 : boundary + 2;
  return { ctx: t.slice(0, start).trim().replace(/[:.]$/, "").trim(), ask: t.slice(start).trim() };
}

function itemList(items: Item[], variant: "num" | "alpha"): string {
  const lis = items
    .map((it) => `<li><span class="q-mk q-mk--${variant}">${it.label}</span><span>${it.text}</span></li>`)
    .join("");
  return `<ul class="q-list">${lis}</ul>`;
}

function stem(text: string): string {
  return `<h2 class="q-stem">${text}</h2>`;
}

function context(text: string): string {
  return text ? `<p class="q-context">${text}</p>` : "";
}

/** Combinação/matching: itens "1- …" associados a descrições "A- …". */
function tryMatching(src: string): string | null {
  const itemRe = /([1-9])-\s+/g;
  const letterRe = /([A-E])-\s+/g;
  const items = [...src.matchAll(itemRe)];
  const letters = [...src.matchAll(letterRe)];
  if (items.length < 2 || letters.length < 2) return null;

  const firstItem = items[0].index!;
  const firstLetter = letters[0].index!;
  if (firstLetter <= firstItem) return null;

  const intro = src.slice(0, firstItem).trim().replace(/[:.]$/, "").trim();
  const itemsRegion = src.slice(firstItem, firstLetter);
  const lettersRegion = src.slice(firstLetter);

  const parsedItems = splitByMarkers(itemsRegion, /([1-9])-\s+/g);
  const parsedLetters = splitByMarkers(lettersRegion, /([A-E])-\s+/g);
  if (parsedItems.length < 2 || parsedLetters.length < 2) return null;

  return `<div class="q-body">
    ${stem(intro)}
    <div class="q-match">
      <div class="q-match-col"><span class="q-col-h">Itens</span>${itemList(parsedItems, "num")}</div>
      <div class="q-match-col"><span class="q-col-h">Descrições</span>${itemList(parsedLetters, "alpha")}</div>
    </div>
  </div>`;
}

/** Cenários com pontos numerados/alfabéticos: "(1) …", "1. …", "(a) …". */
function tryEnumerated(src: string): string | null {
  const numParen = [...src.matchAll(/\((\d+)\)\s*/g)];
  const alphaParen = [...src.matchAll(/\(([a-eA-E])\)\s*/g)];
  const numDot = [...src.matchAll(/(?:^|[\s;:])([1-9])\.\s+(?=[A-ZÀ-Ýa-zà-ý"'])/g)];

  // Escolhe as famílias presentes (uma questão pode ter letras E números).
  const numeric =
    numParen.length >= 2 && numParen[0][1] === "1"
      ? { matches: numParen, re: /\((\d+)\)\s*/g }
      : numDot.length >= 2 && numDot[0][1] === "1"
        ? { matches: numDot.map((m) => ({ ...m })), re: /(?:^|[\s;:])([1-9])\.\s+/g }
        : null;
  const alpha =
    alphaParen.length >= 2 && alphaParen[0][1].toLowerCase() === "a"
      ? { matches: alphaParen, re: /\(([a-eA-E])\)\s*/g }
      : null;

  if (!numeric && !alpha) return null;

  // Índice do primeiro marcador global (início do bloco estruturado).
  const firstIdx = Math.min(
    numeric ? numeric.matches[0].index! : Infinity,
    alpha ? alpha.matches[0].index! : Infinity,
  );
  const intro = src.slice(0, firstIdx).trim().replace(/[:.]$/, "").trim();

  const blocks: string[] = [];
  let tailStart = firstIdx;

  if (alpha) {
    const alphaStart = alpha.matches[0].index!;
    const alphaEnd = numeric ? numeric.matches[0].index! : src.length;
    const region = numeric && numeric.matches[0].index! > alphaStart ? src.slice(alphaStart, alphaEnd) : src.slice(alphaStart);
    const parsed = splitByMarkers(region, /\(([a-eA-E])\)\s*/g);
    if (parsed.length >= 2) {
      blocks.push(itemList(cleanAsk(parsed), "alpha"));
      tailStart = Math.max(tailStart, alphaStart);
    }
  }

  if (numeric) {
    const numStart = numeric.matches[0].index!;
    const region = src.slice(numStart);
    const parsed = splitByMarkers(region, numeric.re);
    if (parsed.length >= 2) {
      blocks.push(itemList(cleanAsk(parsed), "num"));
      tailStart = Math.max(tailStart, numStart);
    }
  }

  if (blocks.length === 0) return null;

  const twoCol = alpha && numeric ? " q-match" : "";
  // A pergunta pode vir antes da lista (enunciado) ou depois dela.
  const introIsAsk = /\?\s*$/.test(intro);
  const tailAsk = introIsAsk ? "" : extractAsk(src.slice(tailStart)).ask;

  return `<div class="q-body">
    ${introIsAsk ? stem(intro) : context(intro)}
    <div class="q-enum${twoCol}">${blocks.map((b) => (twoCol ? `<div class="q-match-col">${b}</div>` : b)).join("")}</div>
    ${tailAsk ? stem(tailAsk) : ""}
  </div>`;
}

/** Remove uma pergunta final que tenha grudado no texto do último item. */
function cleanAsk(items: Item[]): Item[] {
  if (items.length === 0) return items;
  const last = items[items.length - 1];
  const { ctx, ask } = extractAsk(last.text);
  if (ask) items[items.length - 1] = { label: last.label, text: ctx };
  return items;
}

/** Tuplas de caso de teste: "T1(…); T2(…)". */
function tryTuples(src: string): string | null {
  const re = /\b([A-Z]{1,3}\d+)\(([^)]{2,})\)/g;
  const matches = [...src.matchAll(re)];
  if (matches.length < 2) return null;

  const firstIdx = matches[0].index!;
  const lastEnd = matches[matches.length - 1].index! + matches[matches.length - 1][0].length;
  const intro = src.slice(0, firstIdx).trim().replace(/[:.]$/, "").trim();
  const { ask } = extractAsk(src.slice(lastEnd));

  const rows = matches
    .map((m) => {
      // Separa por vírgula+espaço para preservar decimais no formato PT ("1,5h").
      const fields = m[2]
        .split(/,\s+/)
        .map((f) => `<span class="q-cell">${f.trim()}</span>`)
        .join("");
      return `<li><span class="q-mk q-mk--num">${m[1]}</span><span class="q-cells">${fields}</span></li>`;
    })
    .join("");

  return `<div class="q-body">
    ${context(intro)}
    <ul class="q-list q-tuples">${rows}</ul>
    ${ask ? stem(ask) : ""}
  </div>`;
}

/**
 * Converte o enunciado bruto em HTML estruturado. A ordem tenta os padrões mais
 * específicos primeiro (combinação) e cai para o texto simples se nada casar.
 */
export function formatPrompt(raw: string): string {
  const src = raw.trim();
  return tryMatching(src) ?? tryEnumerated(src) ?? tryTuples(src) ?? stem(src);
}
