export type CellState = "empty" | "pass" | "fail" | "answered" | "current";

/** Assinatura visual: grade de cobertura estilo relatório de suíte de testes. */
export function coverageGrid(states: CellState[], clickable = false): string {
  return `<div class="cov">${states
    .map(
      (s, i) =>
        `<i class="cell ${s}" title="Questão ${i + 1}"${
          clickable ? ` data-jump="${i}" role="button" tabindex="0" aria-label="Ir para a questão ${i + 1}"` : ""
        }></i>`,
    )
    .join("")}</div>`;
}
