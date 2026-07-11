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

function itemList(items: Item[], variant: "num" | "alpha" | "roman"): string {
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

type FamKind = "num" | "roman" | "alpha";
interface Family {
  kind: FamKind;
  matches: RegExpMatchArray[];
  re: RegExp;
}

/** Marcadores romanos minúsculos i–x entre parênteses: "(i)", "(ii)", "(iv)"… */
const ROMAN_SRC = "\\((x|ix|iv|v?i{1,3}|v)\\)\\s*";

/** Identifica as famílias de marcadores presentes no texto (números, romanos, letras). */
function detectFamilies(src: string): Family[] {
  const fams: Family[] = [];

  const numParen = [...src.matchAll(/\((\d+)\)\s*/g)];
  const numDot = [...src.matchAll(/(?:^|[\s;:])([1-9])\.\s+(?=[A-ZÀ-Ýa-zà-ý"'])/g)];
  if (numParen.length >= 2 && numParen[0][1] === "1")
    fams.push({ kind: "num", matches: numParen, re: /\((\d+)\)\s*/g });
  else if (numDot.length >= 2 && numDot[0][1] === "1")
    fams.push({ kind: "num", matches: numDot, re: /(?:^|[\s;:])([1-9])\.\s+/g });

  const roman = [...src.matchAll(new RegExp(ROMAN_SRC, "gi"))];
  if (roman.length >= 2 && roman[0][1].toLowerCase() === "i")
    fams.push({ kind: "roman", matches: roman, re: new RegExp(ROMAN_SRC, "gi") });

  const alphaParen = [...src.matchAll(/\(([a-eA-E])\)\s*/g)];
  if (alphaParen.length >= 2 && alphaParen[0][1].toLowerCase() === "a")
    fams.push({ kind: "alpha", matches: alphaParen, re: /\(([a-eA-E])\)\s*/g });

  return fams;
}

/** Separa a pergunta final grudada no texto do último item, devolvendo itens + pergunta. */
function splitTrailingAsk(items: Item[]): { items: Item[]; ask: string } {
  if (items.length === 0) return { items, ask: "" };
  const last = items[items.length - 1];
  const { ctx, ask } = extractAsk(last.text);
  if (ask) items[items.length - 1] = { label: last.label, text: ctx };
  return { items, ask };
}

/** Cenários/listas com marcadores "(1)…", "1.…", "(a)…", "(i)…". */
function tryEnumerated(src: string): string | null {
  const fams = detectFamilies(src);
  if (fams.length === 0) return null;

  // Ordem em que aparecem no texto — define os limites de cada bloco.
  const bySource = [...fams].sort((a, b) => a.matches[0].index! - b.matches[0].index!);
  const overallFirst = bySource[0].matches[0].index!;
  const intro = src.slice(0, overallFirst).trim().replace(/[:.]$/, "").trim();

  const parsed: Partial<Record<FamKind, Item[]>> = {};
  let tailAsk = "";
  bySource.forEach((fam, i) => {
    const start = fam.matches[0].index!;
    const end = i + 1 < bySource.length ? bySource[i + 1].matches[0].index! : src.length;
    let items = splitByMarkers(src.slice(start, end), fam.re);
    if (i === bySource.length - 1) {
      const r = splitTrailingAsk(items);
      items = r.items;
      tailAsk = r.ask;
    }
    if (items.length >= 2) parsed[fam.kind] = items;
  });

  // Exibição: números sempre antes de romanos, e ambos antes de letras.
  const order: FamKind[] = ["num", "roman", "alpha"];
  const present = order.filter((k) => parsed[k]);
  if (present.length === 0) return null;

  const twoCol = !!parsed.num && !!parsed.alpha;
  const introIsAsk = /\?\s*$/.test(intro);
  const ask = introIsAsk ? "" : tailAsk;
  const headers: Record<FamKind, string> = { num: "Itens", roman: "Itens", alpha: "Descrições" };

  const blocks = present.map((k) => {
    // Romanos são exibidos como números convencionais (i→1, ii→2…).
    const items = k === "roman" ? parsed[k]!.map((it, i) => ({ label: String(i + 1), text: it.text })) : parsed[k]!;
    const list = itemList(items, k === "alpha" ? "alpha" : "num");
    return twoCol ? `<div class="q-match-col"><span class="q-col-h">${headers[k]}</span>${list}</div>` : list;
  });

  return `<div class="q-body">
    ${introIsAsk ? stem(intro) : context(intro)}
    <div class="q-enum${twoCol ? " q-match" : ""}">${blocks.join("")}</div>
    ${ask ? stem(ask) : ""}
  </div>`;
}

/**
 * Tabela de decisão: tuplas "T1(Condição=SIM, …)" em que o primeiro registro
 * rotula cada coluna. Renderiza uma tabela real (condições/ação nas linhas e as
 * regras T1…Tn nas colunas) — muito mais legível que a lista de tuplas.
 */
function tryDecisionTable(src: string): string | null {
  const re = /\b([A-Z]{1,3}\d+)\(([^)]{2,})\)/g;
  const matches = [...src.matchAll(re)];
  if (matches.length < 2) return null;

  const firstFields = matches[0][2].split(/,\s+/).map((f) => f.trim());
  // Só é tabela de decisão se o 1º registro nomeia cada coluna no formato "X=Y".
  if (firstFields.length < 2 || !firstFields.every((f) => /=/.test(f))) return null;

  const headers = firstFields.map((f) => f.split("=")[0].trim());
  const cols = matches.map((m) => {
    const fields = m[2].split(/,\s+/).map((f) => f.trim());
    const values = headers.map((_, i) => {
      const f = fields[i] ?? "";
      return f.includes("=") ? f.slice(f.indexOf("=") + 1).trim() : f;
    });
    return { id: m[1], values };
  });

  const firstIdx = matches[0].index!;
  const lastEnd = matches[matches.length - 1].index! + matches[matches.length - 1][0].length;
  const intro = src.slice(0, firstIdx).trim().replace(/[:.]$/, "").trim();
  const { ask } = extractAsk(src.slice(lastEnd));

  // Valores/cabeçalhos são texto extraído do enunciado (podem conter <, >, &).
  const escText = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const cell = (v: string): string => {
    const t = v.toUpperCase();
    const cls =
      t === "SIM" || t === "S" || t === "V" || t === "T"
        ? " v-yes"
        : t === "NÃO" || t === "NAO" || t === "N" || t === "F"
          ? " v-no"
          : "";
    return `<td class="q-dt-v${cls}">${escText(v)}</td>`;
  };

  const headCells = cols.map((c) => `<th scope="col">${escText(c.id)}</th>`).join("");
  const bodyRows = headers
    .map((h, r) => {
      const isAction = r === headers.length - 1;
      const cells = cols.map((c) => cell(c.values[r])).join("");
      return `<tr${isAction ? ' class="q-dt-action"' : ""}><th scope="row">${escText(h)}</th>${cells}</tr>`;
    })
    .join("");

  return `<div class="q-body">
    ${context(intro)}
    <div class="q-dt-wrap"><table class="q-dtable">
      <thead><tr><th class="q-dt-corner"></th>${headCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table></div>
    ${ask ? stem(ask) : ""}
  </div>`;
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
  return tryMatching(src) ?? tryEnumerated(src) ?? tryDecisionTable(src) ?? tryTuples(src) ?? stem(src);
}
