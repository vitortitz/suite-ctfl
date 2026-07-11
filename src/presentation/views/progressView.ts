import type { Chapter } from "@/domain/types";
import type { ProgressDashboard } from "@/application/computeProgress";
import { esc, fmtDuration } from "../dom";

export interface ProgressProps {
  dash: ProgressDashboard;
  chaptersById: Record<number, Chapter>;
}

export function renderProgress(p: ProgressProps): string {
  const d = p.dash;

  const stat = (value: string, label: string) =>
    `<div class="stat"><span class="stat-v">${value}</span><span class="stat-l">${label}</span></div>`;

  // Capítulos já praticados, do mais fraco ao mais forte — alimentam o carrossel.
  const weakChapters = [...d.mastery].filter((m) => m.seen > 0).sort((a, b) => a.pct - b.pct);

  const masteryRows = d.mastery
    .map((m) => {
      const c = p.chaptersById[m.chapter];
      const label = m.seen ? `${m.pct}%` : "—";
      return `<div class="cap-row">
        <span class="cap-name" style="--c:${c.color}">Cap. ${m.chapter}</span>
        <div class="bar"><i style="width:${m.seen ? m.pct : 0}%;--c:${c.color}"></i></div>
        <span class="cap-num">${label}</span>
      </div>`;
    })
    .join("");

  const maxSec = Math.max(60, ...d.last14.map((x) => x.seconds));
  const activity = d.last14
    .map((x) => {
      const hgt = Math.round((x.seconds / maxSec) * 100);
      return `<span class="spark ${x.active ? "on" : ""}" style="--h:${Math.max(x.active ? 12 : 4, hgt)}%" title="${x.day}: ${fmtDuration(x.seconds)}"></span>`;
    })
    .join("");

  const recent =
    d.recent.length === 0
      ? `<p class="muted small">Nenhuma rodada ainda. Faça um simulado para começar a preencher seu histórico.</p>`
      : d.recent
          .map((a) => {
            const modeLabel = a.mode === "exam" ? "Exame" : a.mode === "reinforcement" ? "Reforço" : "Estudo";
            return `<div class="hist">
              <span class="hist-mode">${modeLabel}</span>
              <span class="hist-day">${esc(a.day)}</span>
              <span class="hist-pct ${a.pct >= 65 ? "ok" : "low"}">${a.pct}%</span>
            </div>`;
          })
          .join("");

  const weakCards = weakChapters
    .map((m, i) => {
      const c = p.chaptersById[m.chapter];
      return `<button class="weak-card${i === 0 ? " lead" : ""}" data-ch="${m.chapter}" style="--c:${c.color}">
        ${i === 0 ? `<span class="weak-card-flag">Mais fraco</span>` : ""}
        <span class="weak-card-cap">Cap. ${m.chapter}</span>
        <span class="weak-card-name">${esc(c.name)}</span>
        <div class="bar"><i style="width:${m.pct}%;--c:${c.color}"></i></div>
        <span class="weak-card-foot"><b>${m.pct}%</b> de domínio<span class="weak-card-cta">Treinar →</span></span>
      </button>`;
    })
    .join("");

  const weakSection =
    weakChapters.length > 0
      ? `<section class="weak-panel">
          <div class="weak-panel-head">
            <span class="weak-label">Treinar pontos fracos</span>
            <span class="weak-sub">Escolha um capítulo — a rodada terá apenas questões dele.</span>
          </div>
          <div class="weak-carousel" role="list">${weakCards}</div>
        </section>`
      : `<div class="weak-banner">
          <div><span class="weak-label">Reforço inteligente</span><span class="weak-cap">Responda algumas questões para liberar o treino direcionado.</span></div>
          <button class="btn primary" id="reinforce" disabled>Treinar pontos fracos</button>
        </div>`;

  return `
  <div class="progress">
    <div class="stats-row">
      ${stat(`${d.streak}`, d.streak === 1 ? "dia de sequência" : "dias de sequência")}
      ${stat(fmtDuration(d.totalStudySec), "estudo acumulado")}
      ${stat(`${d.attempts}`, "rodadas feitas")}
      ${stat(d.examBestPct ? `${d.examBestPct}%` : "—", "melhor exame")}
    </div>

    ${weakSection}

    <div class="two-col">
      <div class="card">
        <h3 class="sub">Domínio por capítulo</h3>
        <div class="caps">${masteryRows}</div>
      </div>
      <div class="card">
        <h3 class="sub">Atividade (14 dias)</h3>
        <div class="sparkline">${activity}</div>
        <h3 class="sub" style="margin-top:18px">Últimas rodadas</h3>
        <div class="hist-list">${recent}</div>
      </div>
    </div>
  </div>`;
}
