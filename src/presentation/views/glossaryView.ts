import type { Chapter, ChapterId } from "@/domain/types";
import { GLOSSARY } from "@/infrastructure/data/glossary";
import { GLOSSARY_QUESTIONS } from "@/infrastructure/data/glossaryQuestions";
import { esc } from "../dom";

export interface GlossaryProps {
  chapters: Chapter[];
  /** Filtro ativo: 0 = todos os capítulos. */
  activeChapter: ChapterId | 0;
  query: string;
}

/** Glossário CTFL: busca por termo, filtro por capítulo e quiz de terminologia. */
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
    <div class="gloss-quiz">
      <div class="gloss-quiz-txt">
        <span class="gloss-quiz-kicker">Quiz de terminologia</span>
        <h3>Você domina os termos?</h3>
        <p>Questões difíceis no padrão da prova: distinções sutis, combinação de colunas e cenários para classificar. <span id="gloss-quiz-scope">${GLOSSARY_QUESTIONS.length} questões no total</span>.</p>
      </div>
      <button class="btn quiz-btn" id="gloss-quiz-btn">Testar termos →</button>
    </div>
    <div class="card gloss-head">
      <h2 class="sub">Glossário CTFL v4.0</h2>
      <p class="muted small">${GLOSSARY.length} termos essenciais. Busque por termo ou filtre por capítulo — o filtro também vale para o quiz.</p>
      <div class="gloss-search">
        <input type="search" id="gloss-search" placeholder="Buscar termo (ex.: regressão, risco, cobertura)…"
          autocomplete="off" value="${esc(p.query)}" aria-label="Buscar no glossário" />
      </div>
      <div class="gloss-chips">${chips}</div>
    </div>
    <div class="gloss-list" id="gloss-list">${items}</div>
    <div class="gloss-empty" id="gloss-empty" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8.5" y1="8.5" x2="13.5" y2="13.5"/><line x1="13.5" y1="8.5" x2="8.5" y2="13.5"/></svg>
      <p>Nenhum termo encontrado para os filtros atuais.</p>
      <button class="btn ghost" id="gloss-clear">Limpar filtros</button>
    </div>
  </div>`;
}
