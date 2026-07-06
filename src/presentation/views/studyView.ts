import type { Chapter, ChapterId } from "@/domain/types";
import type { ChapterSyllabus, KLevel } from "@/infrastructure/data/syllabus";
import { esc } from "../dom";

export interface StudyProps {
  chapters: Chapter[];
  syllabus: Record<ChapterId, ChapterSyllabus>;
  active: ChapterId;
}

const K_NAME: Record<KLevel, string> = { K1: "Lembrar", K2: "Compreender", K3: "Aplicar" };

function kBadge(k: KLevel): string {
  return `<span class="kbadge ${k.toLowerCase()}" title="${k} · ${K_NAME[k]}">${k}</span>`;
}

function legend(): string {
  return `<div class="legend">
    <span class="legend-title">Níveis de conhecimento</span>
    <span class="legend-item">${kBadge("K1")} Lembrar</span>
    <span class="legend-item">${kBadge("K2")} Compreender</span>
    <span class="legend-item">${kBadge("K3")} Aplicar</span>
  </div>`;
}

/** Área de estudo: mapa de prioridade por peso no exame + resumo por seção com nível K. */
export function renderStudy(p: StudyProps): string {
  const max = Math.max(...p.chapters.map((c) => c.examWeight));
  const prio = p.chapters
    .map(
      (c) => `<button class="prio ${c.id === p.active ? "on" : ""}" data-ch="${c.id}" style="--c:${c.color}">
        <span class="prio-id">Cap. ${c.id}</span>
        <span class="prio-name">${esc(c.name)}</span>
        <span class="prio-bar"><i style="width:${Math.round((c.examWeight / max) * 100)}%"></i></span>
        <span class="prio-w">${c.examWeight} questões</span>
      </button>`,
    )
    .join("");

  const chap = p.syllabus[p.active];
  const active = p.chapters.find((c) => c.id === p.active)!;
  const sections = chap.sections
    .map(
      (s) => `<details class="acc" open>
        <summary>
          <span class="sec-head"><span class="sec-id">${esc(s.id)}</span><span class="sec-label">${esc(s.label)}</span></span>
          <span class="krow">${s.k.map(kBadge).join("")}</span>
        </summary>
        <div class="acc-body">${s.html}</div>
      </details>`,
    )
    .join("");

  return `
  <div class="study-grid">
    <aside class="prio-map">
      <h3 class="sub">Onde investir</h3>
      <p class="muted small">Ordenado pelo peso no exame. Comece pelos capítulos de maior retorno.</p>
      ${prio}
    </aside>
    <div class="card study-content">
      <span class="tag" style="--c:${active.color}">Cap. ${active.id} · ${esc(active.name)}</span>
      <p class="lead">${esc(chap.intro)}</p>
      ${legend()}
      ${sections}
      <p class="muted small classify-note">Cada seção está classificada pelo nível de conhecimento do syllabus ISTQB CTFL v4.0.</p>
    </div>
  </div>`;
}
