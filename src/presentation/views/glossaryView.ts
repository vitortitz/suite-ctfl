import type { Chapter, ChapterId } from "@/domain/types";
import { GLOSSARY } from "@/infrastructure/data/glossary";
import { esc } from "../dom";

export interface GlossaryProps {
  chapters: Chapter[];
  /** Filtro ativo: 0 = todos os capítulos. */
  activeChapter: ChapterId | 0;
  query: string;
}

/** Glossário CTFL: busca por termo + filtro por capítulo. */
export function renderGlossary(p: GlossaryProps): string {
  const chips = [
    `<button class="gloss-chip ${p.activeChapter === 0 ? "on" : ""}" data-ch="0">Todos</button>`,
    ...p.chapters.map(
      (c) => `<button class="gloss-chip ${p.activeChapter === c.id ? "on" : ""}" data-ch="${c.id}" style="--c:${c.color}">Cap. ${c.id}</button>`,
    ),
  ].join("");

  const items = [...GLOSSARY]
    .sort((a, b) => a.term.localeCompare(b.term, "pt-BR"))
    .map((t) => {
      const c = p.chapters.find((ch) => ch.id === t.chapter)!;
      const hay = `${t.term} ${t.def} ${t.aka ?? ""}`.toLowerCase();
      return `<div class="gloss-item" data-ch="${t.chapter}" data-hay="${esc(hay)}">
        <div class="gloss-term-row">
          <span class="gloss-term">${esc(t.term)}</span>
          <span class="gloss-tag" style="--c:${c.color}">Cap. ${t.chapter}</span>
        </div>
        ${t.aka ? `<span class="gloss-aka">${esc(t.aka)}</span>` : ""}
        <p class="gloss-def">${esc(t.def)}</p>
      </div>`;
    })
    .join("");

  return `
  <div class="glossary">
    <div class="card gloss-head">
      <h2 class="sub">Glossário CTFL v4.0</h2>
      <p class="muted small">${GLOSSARY.length} termos essenciais. Busque por termo ou filtre por capítulo.</p>
      <div class="gloss-search">
        <input type="search" id="gloss-search" placeholder="Buscar termo (ex.: regressão, risco, cobertura)…"
          autocomplete="off" value="${esc(p.query)}" aria-label="Buscar no glossário" />
      </div>
      <div class="gloss-chips">${chips}</div>
    </div>
    <div class="gloss-list" id="gloss-list">${items}</div>
    <p class="muted small gloss-empty" id="gloss-empty" hidden>Nenhum termo encontrado.</p>
  </div>`;
}
