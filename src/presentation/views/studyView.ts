import type { Chapter, ChapterId } from "@/domain/types";
import type { ChapterSyllabus, KLevel } from "@/infrastructure/data/syllabus";
import { esc } from "../dom";

export interface StudyProps {
  chapters: Chapter[];
  syllabus: Record<ChapterId, ChapterSyllabus>;
  active: ChapterId;
  questionCounts: Record<ChapterId, number>;
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
        <span class="prio-w">${p.questionCounts[c.id] ?? 0} no banco · ${c.examWeight} na prova</span>
      </button>`,
    )
    .join("");

  const chap = p.syllabus[p.active];
  const active = p.chapters.find((c) => c.id === p.active)!;
  const stats = `<div class="chapter-stats">
    <span class="stat-chip"><span class="stat-num">${p.questionCounts[active.id] ?? 0}</span> questões no banco</span>
    <span class="stat-chip"><span class="stat-num">~${active.studyMinutes}</span> min de leitura neste app</span>
    <span class="stat-chip muted"><span class="stat-num">${active.officialMinutes}</span> min no curso oficial do syllabus</span>
  </div>`;
  const ttsBar = `<div class="tts-bar">
    <button class="btn ghost tts-toggle" id="tts-toggle" type="button">▶ Ouvir Resumo</button>
    <button class="btn ghost tts-stop" id="tts-stop" type="button" title="Parar leitura" hidden>■ Parar</button>
    <label class="tts-vol">
      <span class="tts-vol-label">Volume</span>
      <input type="range" id="tts-volume" min="0" max="100" value="100" title="100%" aria-label="Volume da narração">
      <span class="tts-vol-value" id="tts-volume-value">100%</span>
    </label>
    <label class="tts-field">
      <span class="tts-vol-label">Velocidade</span>
      <select id="tts-rate" aria-label="Velocidade da narração">
        <option value="0.75">0.75×</option>
        <option value="1" selected>1×</option>
        <option value="1.25">1.25×</option>
        <option value="1.5">1.5×</option>
        <option value="1.75">1.75×</option>
        <option value="2">2×</option>
      </select>
    </label>
    <span class="small muted" id="tts-status" aria-live="polite"></span>
  </div>`;
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
      ${stats}
      ${ttsBar}
      <p class="lead">${esc(chap.intro)}</p>
      ${legend()}
      ${sections}
      <p class="muted small classify-note">Cada seção está classificada pelo nível de conhecimento do syllabus ISTQB CTFL v4.0.</p>
    </div>
  </div>`;
}
