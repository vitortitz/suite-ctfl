import { EXERCISE_KINDS, EXERCISE_LABELS, type ExerciseKind } from "@/domain/services/cap4-exercises";

export interface ExercisesProps {
  kind: ExerciseKind;
  prompt: string;
  feedback: { ok: boolean; explanation: string } | null;
}

/** Painel de exercícios interativos do Cap. 4 (dentro do modal). */
export function renderExercises(p: ExercisesProps): string {
  const tabs = EXERCISE_KINDS.map(
    (k) => `<button class="ex-tab ${k === p.kind ? "on" : ""}" data-kind="${k}">${EXERCISE_LABELS[k]}</button>`,
  ).join("");

  const fb = p.feedback
    ? `<div class="ex-feedback ${p.feedback.ok ? "pass" : "fail"}">
        <b>${p.feedback.ok ? "Correto" : "Ainda não"}</b> — ${p.feedback.explanation}
      </div>`
    : "";

  return `
  <div class="exercises">
    <h2 class="modal-title">Exercícios do Capítulo 4</h2>
    <p class="muted small">Pratique as técnicas de caixa-preta com valores gerados a cada tentativa.</p>
    <div class="ex-tabs">${tabs}</div>
    <div class="ex-card">
      <p class="ex-prompt">${p.prompt}</p>
      <div class="ex-input">
        <input type="text" id="ex-answer" placeholder="Sua resposta" autocomplete="off" />
        <button class="btn primary" id="ex-check">Verificar</button>
      </div>
      ${fb}
      <button class="btn ghost" id="ex-new">Gerar outro</button>
    </div>
  </div>`;
}
