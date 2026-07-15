import { h } from "../dom";
import { enterModal, exitModal } from "../motionFx";

/** Modal acessível simples: fecha no backdrop, no botão e no Esc.
    Entrada com spring e saída rápida via motion.dev. */
export class Modal {
  private root: HTMLElement | null = null;
  open(innerHTML: string, onMount?: (el: HTMLElement) => void): void {
    this.close(true);
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
    enterModal(root);
    onMount?.(root);
  }
  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.close();
  };
  close(instant = false): void {
    if (!this.root) return;
    const el = this.root;
    this.root = null;
    document.removeEventListener("keydown", this.onKey);
    if (instant) {
      el.remove();
      return;
    }
    void exitModal(el).then(() => el.remove());
  }
  get body(): HTMLElement | null {
    return this.root?.querySelector(".modal-body") ?? null;
  }
}
