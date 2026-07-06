export type CellState = "empty" | "pass" | "fail" | "answered" | "current";

/** Assinatura visual: grade de cobertura estilo relatório de suíte de testes. */
export function coverageGrid(states: CellState[], clickable = false): string {
  return `<div class="cov">${states
    .map((s, i) => `<i class="cell ${s}"${clickable ? ` data-jump="${i}" role="button" tabindex="0"` : ""}></i>`)
    .join("")}</div>`;
}
