import type { Chapter, ChapterId, GradeResult, SuiteMode } from "@/domain/types";
import { esc } from "../dom";
import { coverageGrid, type CellState } from "../components/coverageGrid";

export interface StartProps {
  chapters: Chapter[];
  selected: Set<ChapterId>;
  size: number;
}

/** Tela inicial do Simulado: alterna Estudo/Exame, escolhe capítulos e tamanho. */
export function renderStart(p: StartProps): string {
  const chips = p.chapters
    .map(
      (c) => `<button class="chip ${p.selected.has(c.id) ? "on" : ""}" data-ch="${c.id}" style="--c:${c.color}">
        <b>${c.id}</b> ${esc(c.name)}</button>`,
    )
    .join("");
  const sizes = [5, 10, 20]
    .map((n) => `<button class="seg ${p.size === n ? "on" : ""}" data-size="${n}">${n}</button>`)
    .join("");
  return `
  <div class="card">
    <div class="mode-toggle" role="tablist" aria-label="Modo">
      <button class="mode on" data-mode="study" role="tab">Estudo dirigido</button>
      <button class="mode" data-mode="exam" role="tab">Modo exame</button>
    </div>

    <section data-panel="study">
      <p class="lead">Escolha os capítulos e a quantidade. Você recebe correção e explicação a cada questão.</p>
      <div class="field"><span class="lbl">Capítulos</span><div class="chips">${chips}</div></div>
      <div class="field"><span class="lbl">Questões</span><div class="seg-row">${sizes}</div></div>
      <button class="btn primary" id="run-study">Iniciar estudo</button>
    </section>

    <section data-panel="exam" hidden>
      <p class="lead">Simula a prova oficial: <b>40 questões</b> na distribuição 8/6/4/11/9/2, <b>60 minutos</b> e sem feedback até o fim. Aprovação a partir de <b>65%</b>.</p>
      <ul class="brief">
        <li>Navegue entre questões e revise antes de finalizar.</li>
        <li>O tempo corre no topo; ao zerar, a prova é entregue automaticamente.</li>
        <li>A grade de cobertura mostra o que já foi respondido.</li>
      </ul>
      <button class="btn primary" id="run-exam">Iniciar exame</button>
    </section>
  </div>`;
}

export interface RunnerProps {
  mode: SuiteMode;
  index: number;
  total: number;
  chapter: Chapter;
  prompt: string;
  options: string[];
  chosen: number | null;
  revealed: boolean;
  correctPosition: number;
  states: CellState[];
  remainingSec?: number;
}

/** Runner unificado (estudo dá feedback imediato; exame esconde até finalizar). */
export function renderRunner(p: RunnerProps): string {
  const opts = p.options
    .map((text, i) => {
      let cls = "opt";
      if (p.revealed) {
        if (i === p.correctPosition) cls += " reveal-pass";
        else if (i === p.chosen) cls += " reveal-fail";
      } else if (i === p.chosen) cls += " picked";
      const letter = String.fromCharCode(65 + i);
      return `<button class="${cls}" data-opt="${i}" ${p.revealed ? "disabled" : ""}>
        <span class="key">${letter}</span><span class="txt">${text}</span></button>`;
    })
    .join("");

  const clock =
    p.mode === "exam" && p.remainingSec !== undefined
      ? `<span class="run-clock ${p.remainingSec <= 300 ? "warn" : ""}" id="exam-clock"></span>`
      : "";

  const footer =
    p.mode === "exam"
      ? `<div class="run-nav">
          <button class="btn ghost" id="prev" ${p.index === 0 ? "disabled" : ""}>Anterior</button>
          <button class="btn ghost" id="next">${p.index === p.total - 1 ? "Revisar" : "Próxima"}</button>
          <button class="btn primary" id="finish">Finalizar exame</button>
        </div>`
      : `<div class="run-nav">
          <button class="btn primary" id="next" ${p.revealed ? "" : "disabled"}>
            ${p.index === p.total - 1 ? "Ver resultado" : "Próxima questão"}</button>
        </div>`;

  return `
  <div class="card runner">
    <div class="run-top">
      <span class="tag" style="--c:${p.chapter.color}">Cap. ${p.chapter.id} · ${esc(p.chapter.name)}</span>
      <span class="counter">${p.index + 1}/${p.total}</span>
      ${clock}
    </div>
    ${coverageGrid(p.states, p.mode === "exam")}
    <h2 class="q">${p.prompt}</h2>
    <div class="opts">${opts}</div>
    <div class="explain" id="explain" hidden></div>
    ${footer}
  </div>`;
}

export interface ReportProps {
  mode: SuiteMode;
  grade: GradeResult;
  durationSec: number;
  chaptersById: Record<number, Chapter>;
  passed: boolean;
  isExam: boolean;
}

export function renderReport(p: ReportProps): string {
  const rows = Object.keys(p.grade.perChapter)
    .map(Number)
    .sort((a, b) => a - b)
    .map((ch) => {
      const s = p.grade.perChapter[ch as ChapterId]!;
      const c = p.chaptersById[ch];
      return `<div class="cap-row">
        <span class="cap-name" style="--c:${c.color}">Cap. ${ch}</span>
        <div class="bar"><i style="width:${s.pct}%;--c:${c.color}"></i></div>
        <span class="cap-num">${s.correct}/${s.total}</span>
      </div>`;
    })
    .join("");

  const verdict = p.isExam
    ? `<div class="verdict ${p.passed ? "pass" : "fail"}">
        <span class="stamp">${p.passed ? "APROVADO" : "REPROVADO"}</span>
        <span class="verdict-sub">${p.passed ? "Acima da linha de corte de 65%." : "A linha de corte é 65%. Continue treinando."}</span>
      </div>`
    : "";

  return `
  <div class="card report">
    ${verdict}
    <div class="score-hero">
      <div class="ring" style="--pct:${p.grade.pct}"><span>${p.grade.pct}<i>%</i></span></div>
      <div class="score-meta">
        <p><b>${p.grade.correct}</b> de <b>${p.grade.total}</b> corretas</p>
        <p class="muted">Tempo: ${Math.floor(p.durationSec / 60)} min ${p.durationSec % 60}s</p>
      </div>
    </div>
    <h3 class="sub">Desempenho por capítulo</h3>
    <div class="caps">${rows}</div>
    <div class="run-nav">
      <button class="btn primary" id="again">Nova rodada</button>
      <button class="btn ghost" id="to-progress">Ver progresso</button>
    </div>
  </div>`;
}
