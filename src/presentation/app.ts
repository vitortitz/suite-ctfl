import type { Chapter, ChapterId, GradeResult, Suite, User } from "@/domain/types";
import { CHAPTERS, CHAPTER_IDS } from "@/domain/chapters";
import { isPass } from "@/domain/policies/exam";
import { gradeItems } from "@/domain/policies/scoring";
import { buildSuite } from "@/domain/services/suite";
import { shuffle } from "@/domain/random";
import { GLOSSARY_QUESTIONS } from "@/infrastructure/data/glossaryQuestions";
import {
  EXERCISE_KINDS,
  generateExercise,
  type Exercise,
  type ExerciseKind,
} from "@/domain/services/cap4-exercises";
import type { ChapterSyllabus } from "@/infrastructure/data/syllabus";

import type { AuthService } from "@/application/auth/authService";
import { GUEST_USER } from "@/application/auth/authService";
import type { StartStudySuite } from "@/application/startStudySuite";
import type { StartExam } from "@/application/startExam";
import type { BuildReinforcementSuite } from "@/application/buildReinforcementSuite";
import type { GradeSuite } from "@/application/gradeSuite";
import type { TrackStudyTime } from "@/application/trackStudyTime";
import type { ComputeProgress } from "@/application/computeProgress";

import { esc, fmtClock } from "./dom";
import * as fx from "./motionFx";
import { Modal } from "./components/modal";
import type { CellState } from "./components/coverageGrid";
import { renderReport, renderRunner, renderStart } from "./views/suiteView";
import { renderStudy } from "./views/studyView";
import { renderProgress, renderProgressSkeleton } from "./views/progressView";
import { renderGlossary } from "./views/glossaryView";
import { renderExercises } from "./views/exercisesView";
import { renderAuth } from "./views/authView";
import { GoogleCloudTtsReader, type TtsState } from "./googleCloudTts";

export interface AppDeps {
  auth: AuthService;
  cloud: boolean;
  syllabus: Record<ChapterId, ChapterSyllabus>;
  questionCounts: Record<ChapterId, number>;
  startStudy: StartStudySuite;
  startExam: StartExam;
  reinforcement: BuildReinforcementSuite;
  grade: GradeSuite;
  track: TrackStudyTime;
  computeProgress: ComputeProgress;
}

type Tab = "suite" | "study" | "progress" | "glossary";
type SuitePhase = "start" | "runner" | "report";

/** Ícones do cronômetro (SVG em vez de glifos de fonte, que variam por plataforma). */
const IC_PLAY = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><polygon points="6 3 21 12 6 21 6 3"/></svg>`;
const IC_PAUSE = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>`;
const IC_RESET = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>`;

export class App {
  private root!: HTMLElement;
  private view!: HTMLElement;
  private user: User = GUEST_USER;
  private tab: Tab = "suite";
  private modal = new Modal();

  // suite state
  private phase: SuitePhase = "start";
  private suite: Suite | null = null;
  private answers: (number | null)[] = [];
  private idx = 0;
  private revealed = false;
  private suiteStartMs = 0;
  private lastGrade: { grade: GradeResult; durationSec: number; isExam: boolean } | null = null;
  /** Qual animação a próxima renderização do runner deve tocar. */
  private runnerFx: "enter" | "feedback" | "none" = "enter";

  // exam timer
  private examDeadlineMs = 0;
  private examTimer: number | null = null;

  // study config
  private selected = new Set<ChapterId>(CHAPTER_IDS);
  private size = 10;
  private studyChapter: ChapterId = 4;

  // glossary
  private glossaryChapter: ChapterId | 0 = 0;
  private glossaryQuery = "";

  // study stopwatch (masthead)
  private swElapsed = 0;
  private swUnflushed = 0;
  private swRunning = false;
  private swTimer: number | null = null;

  // exercises
  private exKind: ExerciseKind = "equivalence";
  private exercise: Exercise | null = null;
  private exFeedback: { ok: boolean; explanation: string } | null = null;

  // leitura em voz alta (aba estudo)
  private tts = new GoogleCloudTtsReader();
  private ttsUnsubscribe: (() => void) | null = null;
  private ttsErrorUnsubscribe: (() => void) | null = null;

  constructor(private readonly deps: AppDeps) {}

  private get chapters(): Chapter[] {
    return CHAPTER_IDS.map((id) => CHAPTERS[id]);
  }

  async mount(root: HTMLElement): Promise<void> {
    this.root = root;
    this.renderShell();
    this.view = this.root.querySelector<HTMLElement>("#view")!;
    this.wireShell();
    fx.wirePressFeedback();
    document.addEventListener("keydown", (e) => this.onRunnerKey(e));
    try {
      const u = await this.deps.auth.currentUser();
      if (u) this.user = u;
    } catch {
      /* segue como visitante */
    }
    this.updateAccount();
    this.renderView();
  }

  // ---------- shell ----------
  private renderShell(): void {
    const icon = {
      suite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
      study: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      progress: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      glossary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    };
    this.root.innerHTML = `
    <div class="layout">
      <aside class="side">
        <div class="brand">
          <span class="brand-logo">✓</span>
          <span class="brand-txt">Suíte CTFL<span>ISTQB v4.0</span></span>
        </div>
        <nav class="side-nav">
          <button class="tab on" data-tab="suite"><span class="tab-ic">${icon.suite}</span><span class="tab-lbl">Simulado</span></button>
          <button class="tab" data-tab="study"><span class="tab-ic">${icon.study}</span><span class="tab-lbl">Estudo</span></button>
          <button class="tab" data-tab="progress"><span class="tab-ic">${icon.progress}</span><span class="tab-lbl">Progresso</span></button>
          <button class="tab" data-tab="glossary"><span class="tab-ic">${icon.glossary}</span><span class="tab-lbl">Glossário</span></button>
        </nav>
        <button class="ex-launch" id="open-exercises"><span class="ex-badge">Cap. 4</span>Exercícios práticos</button>
        <div class="side-foot">
          <div class="timer" title="Cronômetro de estudo">
            <button class="t-btn" id="timer-toggle" aria-label="Iniciar ou pausar">${IC_PLAY}</button>
            <span class="t-clock" id="study-timer">00:00:00</span>
            <button class="t-btn" id="timer-reset" aria-label="Zerar">${IC_RESET}</button>
          </div>
          <button class="account" id="account-btn">Entrar</button>
        </div>
      </aside>
      <div class="main">
        <div class="veil-clip" aria-hidden="true"><div class="veil" id="veil"></div></div>
        <header class="hero" id="hero"></header>
        <main class="view" id="view"></main>
        <footer class="foot">Conteúdo alinhado ao ISTQB CTFL v4.0 · ferramenta de estudo não oficial</footer>
      </div>
    </div>`;
  }

  private wireShell(): void {
    this.root.querySelectorAll<HTMLButtonElement>(".side-nav .tab").forEach((btn) => {
      btn.addEventListener("click", () => this.setTab(btn.dataset.tab as Tab));
    });
    this.root.querySelector<HTMLButtonElement>("#open-exercises")!.addEventListener("click", () => this.openExercises());
    this.root.querySelector<HTMLButtonElement>("#account-btn")!.addEventListener("click", () => this.openAccount());
    this.root.querySelector<HTMLButtonElement>("#timer-toggle")!.addEventListener("click", () => this.toggleStopwatch());
    this.root.querySelector<HTMLButtonElement>("#timer-reset")!.addEventListener("click", () => this.resetStopwatch());
  }

  private setTab(tab: Tab): void {
    if (tab !== "study") this.tts.stop();
    const changed = tab !== this.tab;
    this.tab = tab;
    if (tab === "suite") this.phase = "start";
    this.root.querySelectorAll<HTMLButtonElement>(".side-nav .tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    const veil = this.root.querySelector<HTMLElement>("#veil");
    if (changed && veil) fx.pageSweep(veil, () => this.renderView());
    else this.renderView();
  }

  /** Cabeçalho hero da área principal, contextual à aba (escondido durante uma suíte em execução). */
  private updateHero(): void {
    const hero = this.root.querySelector<HTMLElement>("#hero");
    if (!hero) return;
    if (this.tab === "suite" && this.phase !== "start") {
      hero.hidden = true;
      return;
    }
    const copy: Record<Tab, { kicker: string; title: string; sub: string }> = {
      suite: { kicker: "Simulado", title: "Rode a suíte em você", sub: "Estudo dirigido com correção imediata ou simulação fiel da prova oficial." },
      study: { kicker: "Estudo", title: "Resumo do syllabus", sub: "Os 6 capítulos do CTFL v4.0 condensados, com leitura em voz alta." },
      progress: { kicker: "Progresso", title: "Seu painel de qualidade", sub: "Histórico, pontos fracos por capítulo e reforço direcionado." },
      glossary: { kicker: "Glossário", title: "A linguagem da prova", sub: "Termos oficiais do ISTQB — e um quiz difícil para testá-los." },
    };
    const c = copy[this.tab];
    hero.hidden = false;
    hero.innerHTML = `<span class="hero-kicker">${c.kicker}</span><h1>${c.title}</h1><p>${c.sub}</p>`;
    fx.enterHero(hero);
  }

  private renderView(): void {
    this.updateHero();
    if (this.tab === "suite") return this.renderSuite();
    if (this.tab === "study") return this.renderStudyTab();
    if (this.tab === "glossary") return this.renderGlossaryTab();
    void this.renderProgressTab();
  }

  // ---------- suite ----------
  private renderSuite(): void {
    if (this.phase === "runner") return this.renderRunnerPhase();
    if (this.phase === "report") return this.renderReportPhase();
    this.view.innerHTML = renderStart({ chapters: this.chapters, selected: this.selected, size: this.size });
    const panels = this.view.querySelectorAll<HTMLElement>("[data-panel]");
    this.view.querySelectorAll<HTMLButtonElement>(".mode").forEach((m) => {
      m.addEventListener("click", () => {
        this.view.querySelectorAll<HTMLButtonElement>(".mode").forEach((x) => x.classList.toggle("on", x === m));
        panels.forEach((p) => (p.hidden = p.dataset.panel !== m.dataset.mode));
      });
    });
    this.view.querySelectorAll<HTMLButtonElement>(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = Number(chip.dataset.ch) as ChapterId;
        if (this.selected.has(id)) this.selected.delete(id);
        else this.selected.add(id);
        if (this.selected.size === 0) this.selected.add(id);
        chip.classList.toggle("on", this.selected.has(id));
      });
    });
    this.view.querySelectorAll<HTMLButtonElement>(".seg").forEach((seg) => {
      seg.addEventListener("click", () => {
        this.size = Number(seg.dataset.size);
        this.view.querySelectorAll<HTMLButtonElement>(".seg").forEach((s) => s.classList.toggle("on", s === seg));
      });
    });
    this.view.querySelector<HTMLButtonElement>("#run-study")!.addEventListener("click", () => this.startStudy());
    this.view.querySelector<HTMLButtonElement>("#run-exam")!.addEventListener("click", () => this.startExam());
    fx.enterView(this.view);
  }

  private beginSuite(suite: Suite): void {
    this.suite = suite;
    this.answers = suite.questions.map(() => null);
    this.idx = 0;
    this.revealed = false;
    this.suiteStartMs = Date.now();
    this.phase = "runner";
    this.tab = "suite";
    this.root.querySelectorAll<HTMLButtonElement>(".subnav .tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === "suite"));
  }

  private startStudy(): void {
    this.beginSuite(this.deps.startStudy.execute([...this.selected], this.size));
    this.renderRunnerPhase();
  }

  private startExam(): void {
    const suite = this.deps.startExam.execute();
    this.beginSuite(suite);
    this.examDeadlineMs = Date.now() + (suite.durationSec ?? 3600) * 1000;
    this.startExamTimer();
    this.renderRunnerPhase();
  }

  private async startReinforcement(chapter?: ChapterId): Promise<void> {
    try {
      const suite = await this.deps.reinforcement.execute(this.user.id, 15, chapter);
      if (suite.questions.length === 0) return;
      this.beginSuite(suite);
      this.renderRunnerPhase();
    } catch {
      /* ignore */
    }
  }

  private computeStates(): CellState[] {
    const s = this.suite!;
    const isExam = s.mode === "exam";
    return s.questions.map((sq, i) => {
      if (i === this.idx) return "current";
      const a = this.answers[i];
      if (a === null || a === undefined) return "empty";
      if (isExam) return "answered";
      return a === sq.correctPosition ? "pass" : "fail";
    });
  }

  private renderRunnerPhase(): void {
    this.updateHero();
    const s = this.suite!;
    const sq = s.questions[this.idx];
    const isExam = s.mode === "exam";
    this.view.innerHTML = renderRunner({
      mode: s.mode,
      index: this.idx,
      total: s.questions.length,
      chapter: CHAPTERS[sq.question.chapter],
      prompt: sq.question.prompt,
      options: sq.order.map((oi) => sq.question.options[oi]),
      chosen: this.answers[this.idx],
      revealed: !isExam && this.revealed,
      correctPosition: sq.correctPosition,
      states: this.computeStates(),
      remainingSec: isExam ? this.examRemaining() : undefined,
    });

    if (!isExam && this.revealed) {
      const ex = this.view.querySelector<HTMLElement>("#explain")!;
      ex.hidden = false;
      const ok = this.answers[this.idx] === sq.correctPosition;
      ex.className = `explain ${ok ? "ok" : "no"}`;
      ex.innerHTML = `<b>${ok ? "Passou" : "Falhou"}</b> — ${sq.question.explanation}`;
    }

    this.view.querySelectorAll<HTMLButtonElement>(".opt").forEach((btn) => {
      btn.addEventListener("click", () => this.chooseOption(Number(btn.dataset.opt)));
    });
    const next = this.view.querySelector<HTMLButtonElement>("#next");
    next?.addEventListener("click", () => this.onNext());
    this.view.querySelector<HTMLButtonElement>("#prev")?.addEventListener("click", () => this.onPrev());
    this.view.querySelector<HTMLButtonElement>("#finish")?.addEventListener("click", () => this.finalize());
    if (isExam) {
      this.view.querySelectorAll<HTMLElement>(".cell[data-jump]").forEach((c) => {
        c.addEventListener("click", () => {
          this.idx = Number(c.dataset.jump);
          this.renderRunnerPhase();
        });
      });
      this.updateExamClock();
    }

    if (this.runnerFx === "feedback") {
      fx.revealFeedback(this.view, this.answers[this.idx] === sq.correctPosition);
    } else if (this.runnerFx === "enter") {
      fx.enterQuestion(this.view);
    }
    this.runnerFx = "enter";
  }

  private chooseOption(i: number): void {
    const s = this.suite!;
    if (s.mode === "exam") {
      this.answers[this.idx] = i;
      this.runnerFx = "none";
      this.renderRunnerPhase();
      return;
    }
    if (this.revealed) return;
    this.answers[this.idx] = i;
    this.revealed = true;
    this.runnerFx = "feedback";
    this.renderRunnerPhase();
  }

  private onNext(): void {
    const s = this.suite!;
    if (s.mode === "exam") {
      this.idx = Math.min(this.idx + 1, s.questions.length - 1);
      this.renderRunnerPhase();
      return;
    }
    if (!this.revealed) return;
    if (this.idx >= s.questions.length - 1) {
      this.finalize();
      return;
    }
    this.idx++;
    this.revealed = false;
    this.renderRunnerPhase();
  }

  private onPrev(): void {
    if (this.idx > 0) {
      this.idx--;
      this.renderRunnerPhase();
    }
  }

  /** Atalhos do runner: A–E/1–5 respondem, Enter/→ avançam, ← volta (exame). */
  private onRunnerKey(e: KeyboardEvent): void {
    if (this.tab !== "suite" || this.phase !== "runner" || !this.suite) return;
    if (document.querySelector(".modal-backdrop")) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const s = this.suite;
    const isExam = s.mode === "exam";
    const total = s.questions[this.idx].order.length;
    let oi = -1;
    if (/^[1-9]$/.test(e.key)) oi = Number(e.key) - 1;
    else if (/^[a-eA-E]$/.test(e.key)) oi = e.key.toUpperCase().charCodeAt(0) - 65;
    if (oi >= 0 && oi < total) {
      if (!isExam && this.revealed) return;
      e.preventDefault();
      this.chooseOption(oi);
      return;
    }
    if (e.key === "Enter" || e.key === "ArrowRight") {
      // Enter com um botão focado já dispara o clique nativo — evita disparo duplo.
      if (e.key === "Enter" && t?.tagName === "BUTTON") return;
      e.preventDefault();
      this.onNext();
    } else if (e.key === "ArrowLeft" && isExam) {
      e.preventDefault();
      this.onPrev();
    }
  }

  // ---------- exam clock ----------
  private examRemaining(): number {
    return Math.max(0, Math.ceil((this.examDeadlineMs - Date.now()) / 1000));
  }
  private startExamTimer(): void {
    this.stopExamTimer();
    this.examTimer = window.setInterval(() => {
      if (this.examRemaining() <= 0) {
        this.finalize();
      } else {
        this.updateExamClock();
      }
    }, 1000);
  }
  private stopExamTimer(): void {
    if (this.examTimer !== null) {
      clearInterval(this.examTimer);
      this.examTimer = null;
    }
  }
  private updateExamClock(): void {
    const el = this.view.querySelector<HTMLElement>("#exam-clock");
    if (!el) return;
    const r = this.examRemaining();
    el.textContent = fmtClock(r);
    el.classList.toggle("warn", r <= 300);
    const track = this.view.querySelector<HTMLElement>("#time-track");
    const bar = this.view.querySelector<HTMLElement>("#time-bar");
    if (track && bar) {
      const total = this.suite?.durationSec ?? 3600;
      const pct = Math.max(0, Math.min(1, r / total));
      // Primeiro paint após re-render: aplica a largura sem transição para a
      // barra não varrer de 100% até o valor atual a cada troca de questão.
      if (bar.style.width === "") {
        bar.style.transition = "none";
        bar.style.width = `${pct * 100}%`;
        void bar.offsetWidth;
        bar.style.transition = "";
      } else {
        bar.style.width = `${pct * 100}%`;
      }
      track.classList.toggle("mid", pct <= 0.5 && pct > 0.15);
      track.classList.toggle("low", pct <= 0.15);
    }
  }

  // ---------- finalize + report ----------
  private async finalize(): Promise<void> {
    const s = this.suite!;
    this.stopExamTimer();
    const durationSec = Math.round((Date.now() - this.suiteStartMs) / 1000);
    const { attempt } = await this.deps.grade.execute(this.user.id, s, this.answers, durationSec);
    const grade = gradeItems(attempt.items);
    this.lastGrade = { grade, durationSec, isExam: s.mode === "exam" };
    this.phase = "report";
    this.renderReportPhase();
  }

  private renderReportPhase(): void {
    this.updateHero();
    if (!this.lastGrade) return this.renderSuite();
    const { grade, durationSec, isExam } = this.lastGrade;
    this.view.innerHTML = renderReport({
      mode: this.suite!.mode,
      grade,
      durationSec,
      chaptersById: CHAPTERS,
      passed: isPass(grade.pct),
      isExam,
    });
    this.view.querySelector<HTMLButtonElement>("#again")!.addEventListener("click", () => {
      this.phase = "start";
      this.suite = null;
      this.renderSuite();
    });
    this.view.querySelector<HTMLButtonElement>("#to-progress")!.addEventListener("click", () => this.setTab("progress"));
    fx.enterView(this.view);
    fx.stampVerdict(this.view);
    const ring = this.view.querySelector<HTMLElement>(".ring");
    if (ring) fx.animateRing(ring, grade.pct);
  }

  // ---------- study tab ----------
  private renderStudyTab(): void {
    this.view.innerHTML = renderStudy({
      chapters: this.chapters,
      syllabus: this.deps.syllabus,
      active: this.studyChapter,
      questionCounts: this.deps.questionCounts,
    });
    this.view.querySelectorAll<HTMLButtonElement>(".prio").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tts.stop();
        this.studyChapter = Number(btn.dataset.ch) as ChapterId;
        this.renderStudyTab();
      });
    });
    this.wireTts();
    fx.wireAccordions(this.view);
    fx.wireScrollReveal(this.view);
    fx.enterView(this.view);
  }

  private wireTts(): void {
    const toggleBtn = this.view.querySelector<HTMLButtonElement>("#tts-toggle")!;
    const stopBtn = this.view.querySelector<HTMLButtonElement>("#tts-stop")!;
    const volumeInput = this.view.querySelector<HTMLInputElement>("#tts-volume")!;
    const volumeValue = this.view.querySelector<HTMLElement>("#tts-volume-value")!;
    const rateSelect = this.view.querySelector<HTMLSelectElement>("#tts-rate")!;
    const statusEl = this.view.querySelector<HTMLElement>("#tts-status")!;

    if (!this.tts.supported) {
      toggleBtn.disabled = true;
      toggleBtn.textContent = "Leitura em voz alta indisponível neste navegador";
      volumeInput.disabled = true;
      rateSelect.disabled = true;
      return;
    }

    const updateVolumeLabel = (): void => {
      const pct = `${volumeInput.value}%`;
      volumeInput.title = pct;
      volumeValue.textContent = pct;
    };
    volumeInput.value = String(Math.round(this.tts.volume * 100));
    updateVolumeLabel();
    rateSelect.value = String(this.tts.rate);

    const eq = this.view.querySelector<HTMLElement>("#tts-eq");
    const updateUi = (state: TtsState): void => {
      if (eq) eq.hidden = state !== "playing";
      stopBtn.hidden = state === "idle";
      toggleBtn.disabled = state === "loading";
      toggleBtn.textContent =
        state === "loading"
          ? "Gerando áudio…"
          : state === "playing"
            ? "⏸ Pausar"
            : state === "paused"
              ? "▶ Continuar"
              : "▶ Ouvir Resumo";
      statusEl.classList.remove("tts-error");
      statusEl.textContent = state === "loading" ? "Gerando áudio…" : state === "playing" ? "Lendo…" : state === "paused" ? "Pausado" : "";
    };
    updateUi(this.tts.state);
    // cada renderStudyTab() recria o DOM: descarta os ouvintes da renderização anterior antes de assinar novos.
    this.ttsUnsubscribe?.();
    this.ttsUnsubscribe = this.tts.onStateChange(updateUi);
    this.ttsErrorUnsubscribe?.();
    this.ttsErrorUnsubscribe = this.tts.onError((message: string) => {
      statusEl.textContent = message;
      statusEl.classList.add("tts-error");
    });

    toggleBtn.addEventListener("click", () => {
      if (this.tts.state === "idle") {
        void this.tts.play(`chapter-${this.studyChapter}`);
      } else {
        this.tts.togglePlayPause();
      }
    });
    stopBtn.addEventListener("click", () => this.tts.stop());
    // Volume e velocidade são aplicados ao vivo (via <audio>), sem custo de rede — não
    // precisa esperar o usuário soltar o controle para ter efeito.
    volumeInput.addEventListener("input", () => {
      updateVolumeLabel();
      this.tts.setVolume(Number(volumeInput.value) / 100);
    });
    rateSelect.addEventListener("change", () => this.tts.setRate(Number(rateSelect.value)));
  }

  // ---------- progress tab ----------
  private async renderProgressTab(): Promise<void> {
    this.view.innerHTML = renderProgressSkeleton();
    const dash = await this.deps.computeProgress.execute(this.user.id);
    this.view.innerHTML = renderProgress({ dash, chaptersById: CHAPTERS });
    const btn = this.view.querySelector<HTMLButtonElement>("#reinforce");
    btn?.addEventListener("click", () => this.startReinforcement());
    this.view.querySelectorAll<HTMLButtonElement>(".weak-card").forEach((card) => {
      card.addEventListener("click", () => this.startReinforcement(Number(card.dataset.ch) as ChapterId));
    });
    const carousel = this.view.querySelector<HTMLElement>(".weak-carousel");
    if (carousel) fx.wireCarousel(carousel);
    fx.enterView(this.view);
  }

  // ---------- glossary tab ----------
  private renderGlossaryTab(): void {
    this.view.innerHTML = renderGlossary({
      chapters: this.chapters,
      activeChapter: this.glossaryChapter,
      query: this.glossaryQuery,
    });
    this.view.querySelector<HTMLButtonElement>("#gloss-quiz-btn")!.addEventListener("click", () => this.startGlossaryQuiz());
    const search = this.view.querySelector<HTMLInputElement>("#gloss-search")!;
    search.addEventListener("input", () => {
      this.glossaryQuery = search.value;
      this.applyGlossaryFilter();
    });
    this.view.querySelectorAll<HTMLButtonElement>(".gloss-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.glossaryChapter = Number(chip.dataset.ch) as ChapterId | 0;
        this.view.querySelectorAll<HTMLButtonElement>(".gloss-chip").forEach((c) => c.classList.toggle("on", c === chip));
        this.applyGlossaryFilter();
      });
    });
    this.view.querySelector<HTMLButtonElement>("#gloss-clear")?.addEventListener("click", () => {
      this.glossaryQuery = "";
      this.glossaryChapter = 0;
      search.value = "";
      this.view.querySelectorAll<HTMLButtonElement>(".gloss-chip").forEach((c) => c.classList.toggle("on", Number(c.dataset.ch) === 0));
      this.applyGlossaryFilter();
      search.focus();
    });
    this.applyGlossaryFilter(false);
    fx.enterView(this.view);
  }

  /** Aplica capítulo + busca aos termos; anima a lista quando o conjunto visível muda. */
  private applyGlossaryFilter(animateChange = true): void {
    const q = this.glossaryQuery.trim().toLowerCase();
    const ch = this.glossaryChapter;
    let visible = 0;
    let changed = false;
    const shown: HTMLElement[] = [];
    this.view.querySelectorAll<HTMLElement>(".gloss-item").forEach((el) => {
      const matchCh = ch === 0 || Number(el.dataset.ch) === ch;
      const matchQ = q === "" || (el.dataset.hay ?? "").includes(q);
      const show = matchCh && matchQ;
      if (el.hidden === show) changed = true;
      el.hidden = !show;
      if (show) {
        visible++;
        shown.push(el);
      }
    });
    if (animateChange && changed) fx.animateFilterList(shown);
    const empty = this.view.querySelector<HTMLElement>("#gloss-empty");
    if (empty) empty.hidden = visible > 0;
    const scope = this.view.querySelector<HTMLElement>("#gloss-quiz-scope");
    if (scope) {
      const n = this.glossaryQuizPool().length;
      scope.textContent = ch === 0 ? `${n} questões no total` : `${n} questões do Cap. ${ch}`;
    }
  }

  /** Questões de terminologia elegíveis segundo o filtro de capítulo ativo no glossário. */
  private glossaryQuizPool() {
    return this.glossaryChapter === 0
      ? GLOSSARY_QUESTIONS
      : GLOSSARY_QUESTIONS.filter((q) => q.chapter === this.glossaryChapter);
  }

  /** Inicia o quiz de terminologia reutilizando o runner do modo estudo. */
  private startGlossaryQuiz(): void {
    const pool = this.glossaryQuizPool();
    if (pool.length === 0) return;
    const questions = shuffle(pool).slice(0, 10);
    const chapterIds = [...new Set(questions.map((q) => q.chapter))];
    this.beginSuite(buildSuite(questions, "study", chapterIds));
    this.renderRunnerPhase();
  }

  // ---------- stopwatch ----------
  private toggleStopwatch(): void {
    this.swRunning = !this.swRunning;
    const toggle = this.root.querySelector<HTMLButtonElement>("#timer-toggle")!;
    toggle.innerHTML = this.swRunning ? IC_PAUSE : IC_PLAY;
    toggle.classList.toggle("on", this.swRunning);
    if (this.swRunning) {
      this.swTimer = window.setInterval(() => this.stopwatchTick(), 1000);
    } else {
      this.stopStopwatch();
      this.flushStudy();
    }
  }
  private stopwatchTick(): void {
    this.swElapsed++;
    this.swUnflushed++;
    this.root.querySelector<HTMLElement>("#study-timer")!.textContent = fmtClock(this.swElapsed);
    if (this.swUnflushed >= 15) this.flushStudy();
  }
  private stopStopwatch(): void {
    if (this.swTimer !== null) {
      clearInterval(this.swTimer);
      this.swTimer = null;
    }
  }
  private resetStopwatch(): void {
    this.stopStopwatch();
    this.flushStudy();
    this.swRunning = false;
    this.swElapsed = 0;
    this.root.querySelector<HTMLElement>("#study-timer")!.textContent = "00:00:00";
    const toggle = this.root.querySelector<HTMLButtonElement>("#timer-toggle")!;
    toggle.innerHTML = IC_PLAY;
    toggle.classList.remove("on");
  }
  private flushStudy(): void {
    if (this.swUnflushed <= 0) return;
    const n = this.swUnflushed;
    this.swUnflushed = 0;
    void this.deps.track.addSeconds(this.user.id, n).catch(() => {});
  }

  // ---------- exercises ----------
  private openExercises(): void {
    this.exFeedback = null;
    this.exercise = generateExercise(this.exKind);
    this.modal.open("", () => this.paintExercises());
  }
  private paintExercises(): void {
    const body = this.modal.body;
    if (!body || !this.exercise) return;
    body.innerHTML = renderExercises({ kind: this.exKind, prompt: this.exercise.prompt, feedback: this.exFeedback });
    body.querySelectorAll<HTMLButtonElement>(".ex-tab").forEach((t) => {
      t.addEventListener("click", () => {
        this.exKind = t.dataset.kind as ExerciseKind;
        this.exFeedback = null;
        this.exercise = generateExercise(this.exKind);
        this.paintExercises();
      });
    });
    body.querySelector<HTMLButtonElement>("#ex-new")!.addEventListener("click", () => {
      this.exFeedback = null;
      this.exercise = generateExercise(this.exKind);
      this.paintExercises();
    });
    const check = () => {
      const input = body.querySelector<HTMLInputElement>("#ex-answer")!;
      const ok = this.exercise!.validate(input.value);
      this.exFeedback = { ok, explanation: this.exercise!.explanation };
      this.paintExercises();
    };
    body.querySelector<HTMLButtonElement>("#ex-check")!.addEventListener("click", check);
    const answer = body.querySelector<HTMLInputElement>("#ex-answer");
    answer?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
    answer?.focus();
    if (this.exFeedback) fx.exerciseFeedback(body, this.exFeedback.ok);
    void EXERCISE_KINDS; // referência para manter o import (lista usada na view)
  }

  // ---------- account / auth ----------
  private updateAccount(): void {
    const btn = this.root.querySelector<HTMLButtonElement>("#account-btn")!;
    btn.textContent = this.user.id === "guest" ? "Entrar" : this.user.name.split(" ")[0];
    btn.classList.toggle("logged", this.user.id !== "guest");
  }

  private openAccount(): void {
    if (this.user.id !== "guest") {
      this.modal.open(
        `<div class="account-card">
          <h2 class="modal-title">Olá, ${esc(this.user.name)}</h2>
          <p class="muted small">${this.user.email ? esc(this.user.email) : "Conta local neste dispositivo"}</p>
          <button class="btn ghost" id="logout">Sair da conta</button>
        </div>`,
        (el) => {
          el.querySelector<HTMLButtonElement>("#logout")!.addEventListener("click", async () => {
            await this.deps.auth.signOut().catch(() => {});
            this.user = GUEST_USER;
            this.updateAccount();
            this.modal.close();
            this.renderView();
          });
        },
      );
      return;
    }
    this.openAuth();
  }

  private openAuth(): void {
    this.modal.open(renderAuth({ supportsSocial: this.deps.auth.supportsSocial, cloud: this.deps.cloud }), (el) =>
      this.wireAuth(el),
    );
  }

  private wireAuth(el: HTMLElement): void {
    const msg = el.querySelector<HTMLElement>("#auth-msg")!;
    const setMsg = (text: string, ok = false) => {
      msg.textContent = text;
      msg.className = `auth-msg ${ok ? "ok" : text ? "err" : ""}`;
    };
    const panels = el.querySelectorAll<HTMLElement>(".auth-panel");
    el.querySelectorAll<HTMLButtonElement>(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        el.querySelectorAll<HTMLButtonElement>(".auth-tab").forEach((t) => t.classList.toggle("on", t === tab));
        panels.forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
        setMsg("");
      });
    });

    el.querySelectorAll<HTMLButtonElement>(".social-btn").forEach((b) => {
      b.addEventListener("click", async () => {
        try {
          await this.deps.auth.signInWithProvider(b.dataset.provider as "google" | "github");
        } catch (e) {
          setMsg((e as Error).message);
        }
      });
    });

    const onLoggedIn = (u: User) => {
      this.user = u;
      this.updateAccount();
      this.modal.close();
      this.renderView();
    };

    el.querySelector<HTMLFormElement>('[data-panel="signin"]')!.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const email = (el.querySelector<HTMLInputElement>("#si-email")!).value;
        const password = (el.querySelector<HTMLInputElement>("#si-pass")!).value;
        const { user } = await this.deps.auth.signIn({ email, password });
        onLoggedIn(user);
      } catch (err) {
        setMsg((err as Error).message);
      }
    });

    el.querySelector<HTMLFormElement>('[data-panel="signup"]')!.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const name = (el.querySelector<HTMLInputElement>("#su-name")!).value;
        const email = (el.querySelector<HTMLInputElement>("#su-email")!).value;
        const password = (el.querySelector<HTMLInputElement>("#su-pass")!).value;
        const { user, recoveryCode } = await this.deps.auth.signUp({ name, email, password });
        if (recoveryCode) {
          const out = el.querySelector<HTMLElement>("#recovery-out")!;
          out.hidden = false;
          out.innerHTML = `<b>Guarde seu código de recuperação:</b><code>${esc(recoveryCode)}</code>
            <span class="small">É a única forma de redefinir a senha desta conta local.</span>
            <button class="btn primary" id="rec-ok">Entendi, continuar</button>`;
          out.querySelector<HTMLButtonElement>("#rec-ok")!.addEventListener("click", () => onLoggedIn(user));
          setMsg("Conta criada.", true);
        } else {
          setMsg("Conta criada. Verifique seu e-mail se necessário.", true);
          onLoggedIn(user);
        }
      } catch (err) {
        setMsg((err as Error).message);
      }
    });

    el.querySelector<HTMLFormElement>('[data-panel="recover"]')!.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (el.querySelector<HTMLInputElement>("#rc-email")!).value;
      const code = (el.querySelector<HTMLInputElement>("#rc-code")!).value || undefined;
      const pass = (el.querySelector<HTMLInputElement>("#rc-pass")!).value || undefined;
      const res = await this.deps.auth.recover(email, code, pass);
      setMsg(res.message, res.ok);
    });
  }
}
