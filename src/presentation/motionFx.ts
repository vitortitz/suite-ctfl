import { animate, inView, press, stagger } from "motion";

/* ============ Suíte CTFL — camada de motion (motion.dev) ============
   Todas as animações passam por aqui para manter duração/easing coesos:
   entrada 240–500ms ease-out, saída mais curta, springs em interações.
   Tudo é ignorado quando o usuário prefere movimento reduzido. */

const SPRING_SNAPPY = { type: "spring", stiffness: 500, damping: 32 } as const;

export const reducedMotion = (): boolean =>
  typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Entrada de uma view recém-renderizada: seções sobem em cascata. */
export function enterView(view: HTMLElement): void {
  if (reducedMotion()) return;
  const sections = Array.from(view.children).filter((el): el is HTMLElement => el instanceof HTMLElement && !el.hidden);
  if (sections.length === 0) return;
  animate(
    sections,
    { opacity: [0, 1], y: [18, 0] },
    { duration: 0.45, delay: stagger(0.07), ease: [0.22, 1, 0.36, 1] },
  );
  popCells(view);
  growBars(view);
  growSparks(view);
  countStats(view);
}

/** Hero contextual: kicker, título e subtítulo entram em sequência. */
export function enterHero(hero: HTMLElement): void {
  if (reducedMotion() || hero.hidden) return;
  const parts = hero.querySelectorAll<HTMLElement>(".hero-kicker, h1, p");
  if (parts.length === 0) return;
  animate(
    parts,
    { opacity: [0, 1], y: [14, 0] },
    { duration: 0.5, delay: stagger(0.08), ease: [0.22, 1, 0.36, 1] },
  );
}

/** Células da grade de cobertura pipocam em cascata (limitada para grades grandes). */
function popCells(scope: HTMLElement): void {
  const cells = scope.querySelectorAll<HTMLElement>(".cov .cell");
  if (cells.length === 0) return;
  animate(
    cells,
    { opacity: [0, 1], scale: [0.4, 1] },
    { duration: 0.3, delay: stagger(Math.min(0.02, 0.6 / cells.length)), ease: "backOut" },
  );
}

/** Barras de progresso crescem da esquerda. */
function growBars(scope: HTMLElement): void {
  const bars = scope.querySelectorAll<HTMLElement>(".bar i, .prio-bar i");
  if (bars.length === 0) return;
  bars.forEach((b) => {
    animate(b, { scaleX: [0, 1] }, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    b.style.transformOrigin = "left";
  });
}

/** Sparkline de atividade: as barrinhas crescem do chão em cascata. */
function growSparks(scope: HTMLElement): void {
  const sparks = scope.querySelectorAll<HTMLElement>(".spark");
  if (sparks.length === 0) return;
  animate(
    sparks,
    { scaleY: [0, 1] },
    { duration: 0.5, delay: stagger(0.035, { startDelay: 0.15 }), ease: [0.22, 1, 0.36, 1] },
  );
}

/** Seções do syllabus entram conforme aparecem na rolagem (uma única vez cada). */
export function wireScrollReveal(scope: HTMLElement, selector = ".acc"): void {
  if (reducedMotion()) return;
  scope.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.style.opacity = "0";
    inView(
      el,
      () => {
        animate(el, { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, ease: [0.22, 1, 0.36, 1] });
      },
      { amount: 0.1 },
    );
  });
}

/** Números dos cartões de estatística contam do zero. */
function countStats(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>(".stat-v").forEach((el) => {
    const raw = el.textContent ?? "";
    const m = raw.match(/^(\d+)(.*)$/);
    if (!m) return;
    const target = Number(m[1]);
    const suffix = m[2];
    if (!Number.isFinite(target) || target <= 0) return;
    animate(0, target, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = `${Math.round(v)}${suffix}`),
    });
  });
}

/** Anel de nota do relatório: percentual e número sobem juntos. */
export function animateRing(ring: HTMLElement, pct: number): void {
  const label = ring.querySelector<HTMLElement>("span");
  if (reducedMotion()) {
    ring.style.setProperty("--pct", String(pct));
    return;
  }
  const suffix = label?.querySelector("i")?.outerHTML ?? "";
  animate(0, pct, {
    duration: 1.1,
    ease: [0.22, 1, 0.36, 1],
    onUpdate: (v) => {
      ring.style.setProperty("--pct", String(v));
      if (label) label.innerHTML = `${Math.round(v)}${suffix}`;
    },
  });
}

/** Troca de questão no runner: enunciado desce e alternativas entram em cascata. */
export function enterQuestion(view: HTMLElement): void {
  if (reducedMotion()) return;
  const stem = view.querySelector<HTMLElement>(".q");
  if (stem) animate(stem, { opacity: [0, 1], y: [12, 0] }, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
  const opts = view.querySelectorAll<HTMLElement>(".opt");
  if (opts.length > 0) {
    animate(
      opts,
      { opacity: [0, 1], y: [14, 0] },
      { duration: 0.35, delay: stagger(0.05, { startDelay: 0.08 }), ease: [0.22, 1, 0.36, 1] },
    );
  }
}

/** Feedback do estudo dirigido: acerto pulsa, erro balança; explicação desliza. */
export function revealFeedback(view: HTMLElement, correct: boolean): void {
  if (reducedMotion()) return;
  const pass = view.querySelector<HTMLElement>(".opt.reveal-pass");
  const fail = view.querySelector<HTMLElement>(".opt.reveal-fail");
  if (pass) animate(pass, { scale: [1, 1.025, 1] }, { duration: 0.4, ease: "easeOut" });
  if (!correct && fail) animate(fail, { x: [0, -7, 6, -4, 2, 0] }, { duration: 0.45, ease: "easeOut" });
  const explain = view.querySelector<HTMLElement>(".explain:not([hidden])");
  if (explain) animate(explain, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
}

/** Carimbo do veredito bate na tela como um selo. */
export function stampVerdict(view: HTMLElement): void {
  if (reducedMotion()) return;
  const stamp = view.querySelector<HTMLElement>(".stamp");
  if (!stamp) return;
  animate(
    stamp,
    { opacity: [0, 1], scale: [1.6, 1], rotate: [-8, -2] },
    { duration: 0.5, delay: 0.25, ease: "backOut" },
  );
}

/** Abertura do modal: backdrop esmaece, cartão entra com spring. */
export function enterModal(backdrop: HTMLElement): void {
  if (reducedMotion()) return;
  const card = backdrop.querySelector<HTMLElement>(".modal");
  animate(backdrop, { opacity: [0, 1] }, { duration: 0.2, ease: "easeOut" });
  if (card) animate(card, { opacity: [0, 1], scale: [0.92, 1], y: [24, 0] }, SPRING_SNAPPY);
}

/** Fechamento do modal: mais rápido que a entrada; resolve ao terminar. */
export function exitModal(backdrop: HTMLElement): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  const card = backdrop.querySelector<HTMLElement>(".modal");
  if (card) animate(card, { opacity: 0, scale: 0.95, y: 12 }, { duration: 0.16, ease: "easeIn" });
  return animate(backdrop, { opacity: 0 }, { duration: 0.18, ease: "easeIn" }).finished.then(() => undefined);
}

let sweeping = false;

/** Troca de aba: um véu gradiente varre a área principal, o conteúdo troca
    escondido atrás dele e o véu sai pelo outro lado. */
export function pageSweep(veil: HTMLElement, swap: () => void): void {
  if (reducedMotion() || sweeping) {
    swap();
    return;
  }
  sweeping = true;
  veil.style.visibility = "visible";
  animate(veil, { x: ["-105%", "0%"] }, { duration: 0.22, ease: [0.7, 0, 0.84, 0] })
    .finished.then(() => {
      swap();
      return animate(veil, { x: ["0%", "105%"] }, { duration: 0.32, delay: 0.05, ease: [0.16, 1, 0.3, 1] }).finished;
    })
    .finally(() => {
      veil.style.visibility = "hidden";
      sweeping = false;
    });
}

/** Resultado de filtro (glossário): itens visíveis reentram em cascata sutil.
    Anima só os primeiros — o resto está abaixo da dobra. */
export function animateFilterList(items: HTMLElement[]): void {
  if (reducedMotion() || items.length === 0) return;
  const batch = items.slice(0, 24);
  animate(
    batch,
    { opacity: [0, 1], scale: [0.96, 1], y: [8, 0] },
    { duration: 0.28, delay: stagger(Math.min(0.03, 0.35 / batch.length)), ease: [0.22, 1, 0.36, 1] },
  );
}

/** Acordeões do syllabus: abrem/fecham com altura animada em vez do salto nativo.
    Com movimento reduzido mantém o comportamento padrão do <details>. */
export function wireAccordions(scope: HTMLElement): void {
  if (reducedMotion()) return;
  scope.querySelectorAll<HTMLDetailsElement>("details.acc").forEach((det) => {
    const summary = det.querySelector<HTMLElement>("summary");
    const body = det.querySelector<HTMLElement>(".acc-body");
    if (!summary || !body) return;
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (det.dataset.anim) return;
      det.dataset.anim = "1";
      const done = (): void => {
        body.style.height = "";
        body.style.overflow = "";
        body.style.opacity = "";
        delete det.dataset.anim;
      };
      body.style.overflow = "hidden";
      if (det.open) {
        const h = body.offsetHeight;
        animate(body, { height: [h, 0], opacity: [1, 0] }, { duration: 0.22, ease: "easeIn" }).finished.then(() => {
          det.open = false;
          done();
        });
      } else {
        det.open = true;
        const h = body.offsetHeight;
        animate(body, { height: [0, h], opacity: [0, 1] }, { duration: 0.3, ease: [0.22, 1, 0.36, 1] }).finished.then(done);
      }
    });
  });
}

/** Carrossel de pontos fracos: setas de navegação + arrastar com o mouse.
    O arrasto só começa após 6px de movimento, para não engolir o clique dos cards. */
export function wireCarousel(car: HTMLElement): void {
  const head = car.parentElement?.querySelector<HTMLElement>(".weak-panel-head");
  if (head && car.scrollWidth > car.clientWidth + 4) {
    const chev = (d: number): string =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${d < 0 ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}"/></svg>`;
    const nav = document.createElement("div");
    nav.className = "car-nav";
    nav.innerHTML = `<button class="car-btn" data-dir="-1" aria-label="Cards anteriores">${chev(-1)}</button>
      <button class="car-btn" data-dir="1" aria-label="Próximos cards">${chev(1)}</button>`;
    head.appendChild(nav);
    const [prev, next] = Array.from(nav.querySelectorAll<HTMLButtonElement>(".car-btn"));
    const update = (): void => {
      prev.disabled = car.scrollLeft <= 2;
      next.disabled = car.scrollLeft >= car.scrollWidth - car.clientWidth - 2;
    };
    [prev, next].forEach((b) =>
      b.addEventListener("click", () => {
        car.scrollBy({ left: Number(b.dataset.dir) * (car.clientWidth - 80), behavior: reducedMotion() ? "auto" : "smooth" });
      }),
    );
    car.addEventListener("scroll", update, { passive: true });
    update();
  }

  let startX = 0;
  let startLeft = 0;
  let active = false;
  let dragging = false;
  let justDragged = false;
  car.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    active = true;
    dragging = false;
    startX = e.clientX;
    startLeft = car.scrollLeft;
  });
  car.addEventListener("pointermove", (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    if (!dragging && Math.abs(dx) > 6) {
      dragging = true;
      car.setPointerCapture(e.pointerId);
      car.style.scrollSnapType = "none";
      car.classList.add("dragging");
    }
    if (dragging) car.scrollLeft = startLeft - dx;
  });
  const endDrag = (): void => {
    if (!active) return;
    active = false;
    if (dragging) {
      dragging = false;
      justDragged = true;
      setTimeout(() => (justDragged = false), 0);
      car.style.scrollSnapType = "";
      car.classList.remove("dragging");
    }
  };
  car.addEventListener("pointerup", endDrag);
  car.addEventListener("pointercancel", endDrag);
  car.addEventListener(
    "click",
    (e) => {
      if (justDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
}

/** Feedback do modal de exercícios: acerto desliza suave, erro balança. */
export function exerciseFeedback(scope: HTMLElement, ok: boolean): void {
  if (reducedMotion()) return;
  const el = scope.querySelector<HTMLElement>(".ex-feedback");
  if (!el) return;
  animate(el, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, ease: [0.22, 1, 0.36, 1] });
  if (!ok) animate(el, { x: [0, -6, 5, -3, 0] }, { duration: 0.4, delay: 0.08, ease: "easeOut" });
}

/** Squish global de botões: delegado no documento, sobrevive a re-renderizações. */
export function wirePressFeedback(): void {
  if (reducedMotion()) return;
  press("button, .btn, .opt, .chip, .weak-card, .prio, .cell[data-jump]", (el) => {
    animate(el, { scale: 0.965 }, { duration: 0.12, ease: "easeOut" });
    return () => animate(el, { scale: 1 }, SPRING_SNAPPY);
  });
}
