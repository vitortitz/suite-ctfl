import { h } from "../dom";

/** Modal acessível simples: fecha no backdrop, no botão e no Esc. */
export class Modal {
  private root: HTMLElement | null = null;
  open(innerHTML: string, onMount?: (el: HTMLElement) => void): void {
    this.close();
    this.root = h(`<div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <button class="modal-x" aria-label="Fechar">✕</button>
        <div class="modal-body">${innerHTML}</div>
      </div>
    </div>`);
    const root = this.root;
    root.addEventListener("click", (e) => {
      if (e.target === root) this.close();
    });
    root.querySelector<HTMLButtonElement>(".modal-x")!.addEventListener("click", () => this.close());
    document.addEventListener("keydown", this.onKey);
    document.body.appendChild(root);
    onMount?.(root);
  }
  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.close();
  };
  close(): void {
    if (this.root) {
      this.root.remove();
      this.root = null;
      document.removeEventListener("keydown", this.onKey);
    }
  }
  get body(): HTMLElement | null {
    return this.root?.querySelector(".modal-body") ?? null;
  }
}
