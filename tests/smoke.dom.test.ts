// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { App } from "@/presentation/app";
import { AuthService } from "@/application/auth/authService";
import { LocalAuthProvider } from "@/infrastructure/auth/localAuthProvider";
import { createBrowserStore } from "@/infrastructure/storage/kvStore";
import { LocalProgressRepository } from "@/infrastructure/storage/localProgressRepository";
import { StaticQuestionSource } from "@/infrastructure/data/staticQuestionSource";
import { SYLLABUS } from "@/infrastructure/data/syllabus";
import { CHAPTER_IDS } from "@/domain/chapters";
import { StartStudySuite } from "@/application/startStudySuite";
import { StartExam } from "@/application/startExam";
import { BuildReinforcementSuite } from "@/application/buildReinforcementSuite";
import { GradeSuite } from "@/application/gradeSuite";
import { TrackStudyTime } from "@/application/trackStudyTime";
import { ComputeProgress } from "@/application/computeProgress";

function makeApp() {
  const store = createBrowserStore();
  const questions = new StaticQuestionSource();
  const questionCounts = Object.fromEntries(
    CHAPTER_IDS.map((id) => [id, questions.byChapter(id).length]),
  ) as Record<(typeof CHAPTER_IDS)[number], number>;
  const progress = new LocalProgressRepository(store);
  const auth = new AuthService(new LocalAuthProvider(store));
  return new App({
    auth,
    cloud: false,
    syllabus: SYLLABUS,
    questionCounts,
    startStudy: new StartStudySuite({ questions }),
    startExam: new StartExam({ questions }),
    reinforcement: new BuildReinforcementSuite({ questions, progress }),
    grade: new GradeSuite({ progress }),
    track: new TrackStudyTime({ progress }),
    computeProgress: new ComputeProgress({ progress }),
  });
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("App (smoke DOM)", () => {
  let root: HTMLElement;
  beforeEach(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app")!;
    await makeApp().mount(root);
  });

  it("monta a masthead, subnav e a tela inicial do simulado", () => {
    expect(root.querySelector(".brand")).toBeTruthy();
    expect(root.querySelectorAll(".subnav .tab").length).toBe(3);
    expect(root.querySelector("#run-study")).toBeTruthy();
    expect(root.querySelector('[data-panel="exam"]')).toBeTruthy();
  });

  it("troca para a aba Estudo e mostra o mapa de prioridade", () => {
    (root.querySelector('.tab[data-tab="study"]') as HTMLButtonElement).click();
    expect(root.querySelectorAll(".prio").length).toBe(6);
    expect(root.querySelector(".study-content")).toBeTruthy();
  });

  it("mostra a legenda de níveis e classifica cada seção com selo K", () => {
    (root.querySelector('.tab[data-tab="study"]') as HTMLButtonElement).click(); // Cap. 4 (ativo padrão)
    expect(root.querySelectorAll(".legend .kbadge").length).toBe(3);
    // cada seção do capítulo tem ao menos um selo K
    const sections = root.querySelectorAll("details.acc");
    expect(sections.length).toBeGreaterThan(0);
    sections.forEach((sec) => expect(sec.querySelector(".krow .kbadge")).toBeTruthy());
    // Cap. 4 contém pelo menos uma seção K3 (aplicar)
    expect(root.querySelector(".krow .kbadge.k3")).toBeTruthy();
    // números de seção visíveis (ex.: 4.2)
    expect(root.querySelector(".sec-id")!.textContent).toMatch(/^4\./);
  });

  it("carrega a aba Progresso (assíncrona) com os cartões de estatística", async () => {
    (root.querySelector('.tab[data-tab="progress"]') as HTMLButtonElement).click();
    await tick();
    expect(root.querySelectorAll(".stat").length).toBe(4);
    expect(root.querySelector(".weak-banner")).toBeTruthy();
  });

  it("inicia um estudo, dá feedback ao responder e habilita avançar", () => {
    (root.querySelector("#run-study") as HTMLButtonElement).click();
    expect(root.querySelector(".runner")).toBeTruthy();
    const opts = root.querySelectorAll<HTMLButtonElement>(".opt");
    expect(opts.length).toBeGreaterThanOrEqual(2);
    opts[0].click();
    const explain = root.querySelector<HTMLElement>("#explain")!;
    expect(explain.hidden).toBe(false);
    expect((root.querySelector("#next") as HTMLButtonElement).disabled).toBe(false);
  });

  it("percorre a suíte inteira até o relatório de resultado", async () => {
    (root.querySelector("#run-study") as HTMLButtonElement).click();
    for (let guard = 0; guard < 40; guard++) {
      const runner = root.querySelector(".runner");
      if (!runner) break;
      (root.querySelector(".opt") as HTMLButtonElement).click();
      (root.querySelector("#next") as HTMLButtonElement).click();
      await tick();
    }
    expect(root.querySelector(".report")).toBeTruthy();
    expect(root.querySelector(".ring")).toBeTruthy();
  });

  it("abre o modal de exercícios do Cap. 4 e valida a resposta", () => {
    (root.querySelector("#open-exercises") as HTMLButtonElement).click();
    const modal = document.querySelector(".modal-body")!;
    expect(modal.querySelector(".ex-tabs")).toBeTruthy();
    const answer = modal.querySelector<HTMLInputElement>("#ex-answer")!;
    answer.value = "999999";
    (modal.querySelector("#ex-check") as HTMLButtonElement).click();
    expect(document.querySelector(".ex-feedback")).toBeTruthy();
  });
});
