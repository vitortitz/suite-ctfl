import type { Chapter, ChapterId, GradeResult, Suite, User } from "@/domain/types";
import { CHAPTERS, CHAPTER_IDS } from "@/domain/chapters";
import { isPass } from "@/domain/policies/exam";
import { gradeItems } from "@/domain/policies/scoring";
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
import { Modal } from "./components/modal";
import type { CellState } from "./components/coverageGrid";
import { renderReport, renderRunner, renderStart } from "./views/suiteView";
import { renderStudy } from "./views/studyView";
import { renderProgress } from "./views/progressView";
import { renderExercises } from "./views/exercisesView";
import { renderAuth } from "./views/authView";
import { TtsReader, chapterToSpeechText, type TtsState } from "./tts";

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

type Tab = "suite" | "study" | "progress";
type SuitePhase = "start" | "runner" | "report";

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

  // exam timer
  private examDeadlineMs = 0;
  private examTimer: number | null = null;

  // study config
  private selected = new Set<ChapterId>(CHAPTER_IDS);
  private size = 10;
  private studyChapter: ChapterId = 4;

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
  private tts = new TtsReader();
  private ttsUnsubscribe: (() => void) | null = null;

  constructor(private readonly deps: AppDeps) {}

  private get chapters(): Chapter[] {
    return CHAPTER_IDS.map((id) => CHAPTERS[id]);
  }

  async mount(root: HTMLElement): Promise<void> {
    this.root = root;
    this.renderShell();
    this.view = this.root.querySelector<HTMLElement>("#view")!;
    this.wireShell();
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
    this.root.innerHTML = `
    <header class="mast">
      <div class="brand">Suíte CTFL<span>self test runner</span></div>
      <div class="mast-tools">
        <div class="timer" title="Cronômetro de estudo">
          <button class="t-btn" id="timer-toggle" aria-label="Iniciar ou pausar">▶</button>
          <span class="t-clock" id="study-timer">00:00:00</span>
          <button class="t-btn" id="timer-reset" aria-label="Zerar">↺</button>
        </div>
        <button class="account" id="account-btn">Entrar</button>
      </div>
    </header>
    <nav class="subnav">
      <button class="tab on" data-tab="suite">Simulado</button>
      <button class="tab" data-tab="study">Estudo</button>
      <button class="tab" data-tab="progress">Progresso</button>
      <button class="ex-launch" id="open-exercises">Exercícios Cap. 4</button>
    </nav>
    <main class="view" id="view"></main>
    <footer class="foot">Conteúdo alinhado ao ISTQB CTFL v4.0 · ferramenta de estudo não oficial</footer>`;
  }

  private wireShell(): void {
    this.root.querySelectorAll<HTMLButtonElement>(".subnav .tab").forEach((btn) => {
      btn.addEventListener("click", () => this.setTab(btn.dataset.tab as Tab));
    });
    this.root.querySelector<HTMLButtonElement>("#open-exercises")!.addEventListener("click", () => this.openExercises());
    this.root.querySelector<HTMLButtonElement>("#account-btn")!.addEventListener("click", () => this.openAccount());
    this.root.querySelector<HTMLButtonElement>("#timer-toggle")!.addEventListener("click", () => this.toggleStopwatch());
    this.root.querySelector<HTMLButtonElement>("#timer-reset")!.addEventListener("click", () => this.resetStopwatch());
  }

  private setTab(tab: Tab): void {
    if (tab !== "study") this.tts.stop();
    this.tab = tab;
    if (tab === "suite") this.phase = "start";
    this.root.querySelectorAll<HTMLButtonElement>(".subnav .tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    this.renderView();
  }

  private renderView(): void {
    if (this.tab === "suite") return this.renderSuite();
    if (this.tab === "study") return this.renderStudyTab();
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

  private async startReinforcement(): Promise<void> {
    try {
      const suite = await this.deps.reinforcement.execute(this.user.id);
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
  }

  private chooseOption(i: number): void {
    const s = this.suite!;
    if (s.mode === "exam") {
      this.answers[this.idx] = i;
      this.renderRunnerPhase();
      return;
    }
    if (this.revealed) return;
    this.answers[this.idx] = i;
    this.revealed = true;
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
  }

  private wireTts(): void {
    const toggleBtn = this.view.querySelector<HTMLButtonElement>("#tts-toggle")!;
    const stopBtn = this.view.querySelector<HTMLButtonElement>("#tts-stop")!;
    const volumeInput = this.view.querySelector<HTMLInputElement>("#tts-volume")!;
    const statusEl = this.view.querySelector<HTMLElement>("#tts-status")!;

    if (!this.tts.supported) {
      toggleBtn.disabled = true;
      toggleBtn.textContent = "Leitura em voz alta indisponível neste navegador";
      volumeInput.disabled = true;
      return;
    }

    volumeInput.value = String(Math.round(this.tts.volume * 100));
    const updateUi = (state: TtsState): void => {
      stopBtn.hidden = state === "idle";
      toggleBtn.textContent = state === "playing" ? "Pausar" : state === "paused" ? "Continuar leitura" : "▶ Ouvir resumo do capítulo";
      statusEl.textContent = state === "playing" ? "Lendo…" : state === "paused" ? "Pausado" : "";
    };
    updateUi(this.tts.state);
    // cada renderStudyTab() recria o DOM: descarta o ouvinte da renderização anterior antes de assinar um novo.
    this.ttsUnsubscribe?.();
    this.ttsUnsubscribe = this.tts.onStateChange(updateUi);

    toggleBtn.addEventListener("click", () => {
      if (this.tts.state === "idle") {
        const chapterName = CHAPTERS[this.studyChapter].name;
        this.tts.speak(chapterToSpeechText(chapterName, this.deps.syllabus[this.studyChapter]));
      } else {
        this.tts.togglePlayPause();
      }
    });
    stopBtn.addEventListener("click", () => this.tts.stop());
    volumeInput.addEventListener("change", () => this.tts.setVolume(Number(volumeInput.value) / 100));
  }

  // ---------- progress tab ----------
  private async renderProgressTab(): Promise<void> {
    this.view.innerHTML = `<div class="card loading">Carregando seu progresso…</div>`;
    const dash = await this.deps.computeProgress.execute(this.user.id);
    this.view.innerHTML = renderProgress({ dash, chaptersById: CHAPTERS });
    const btn = this.view.querySelector<HTMLButtonElement>("#reinforce");
    btn?.addEventListener("click", () => this.startReinforcement());
  }

  // ---------- stopwatch ----------
  private toggleStopwatch(): void {
    this.swRunning = !this.swRunning;
    const toggle = this.root.querySelector<HTMLButtonElement>("#timer-toggle")!;
    toggle.textContent = this.swRunning ? "⏸" : "▶";
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
    toggle.textContent = "▶";
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
    body.querySelector<HTMLInputElement>("#ex-answer")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
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
