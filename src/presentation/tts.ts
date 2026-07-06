import type { ChapterSyllabus } from "@/infrastructure/data/syllabus";

export type TtsState = "idle" | "playing" | "paused";

/** Extrai o texto falado de um capítulo: nome, introdução e cada seção (rótulo + conteúdo sem HTML). */
export function chapterToSpeechText(chapterName: string, chapter: ChapterSyllabus): string {
  const strip = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? "").replace(/\s+/g, " ").trim();
  };
  const parts = [`Capítulo: ${chapterName}.`, chapter.intro];
  for (const sec of chapter.sections) {
    parts.push(`${sec.label}.`, strip(sec.html));
  }
  return parts.join(" ");
}

/** Pontua vozes disponíveis, priorizando pt-BR e motores mais naturais (Google/Neural/Online). */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  let score: number;
  if (lang === "pt-br") score = 12;
  else if (lang.startsWith("pt")) score = 6;
  else return -1;
  const name = v.name.toLowerCase();
  if (/google/.test(name)) score += 5;
  if (/natural|online|neural/.test(name)) score += 4;
  if (!v.localService) score += 1;
  return score;
}

/**
 * Wrapper fino sobre a Web Speech API (`speechSynthesis`) para ler o resumo de um
 * capítulo em voz alta. Usa um contador de geração para descartar callbacks de
 * utterances supersedidas (cancel/speak em sequência é uma corrida conhecida da API).
 */
export class TtsReader {
  readonly supported = typeof window !== "undefined" && "speechSynthesis" in window;
  state: TtsState = "idle";
  volume = 1;
  /** Velocidade da fala: 1 = ritmo normal da voz, ajustável pelo usuário (0.5×–2×). */
  rate = 1;

  private lastText = "";
  private gen = 0;
  private readonly listeners = new Set<(s: TtsState) => void>();
  // Mantém uma referência forte ao utterance em voo: em Chrome, um SpeechSynthesisUtterance
  // sem referência externa pode ser coletado pelo GC antes (ou durante) a fala, cancelando-a
  // silenciosamente — por isso não basta criar a variável local dentro de speak().
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    // Em alguns navegadores (Chrome), a lista de vozes só é preenchida de forma assíncrona;
    // chamar getVoices() cedo ajuda a "aquecer" o carregamento antes do primeiro clique.
    if (this.supported) window.speechSynthesis.getVoices();
  }

  /** Registra um ouvinte de mudança de estado; retorna função para removê-lo. */
  onStateChange(cb: (s: TtsState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setState(s: TtsState): void {
    this.state = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    if (!this.supported) return undefined;
    return window.speechSynthesis
      .getVoices()
      .map((v) => ({ v, s: scoreVoice(v) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)[0]?.v;
  }

  speak(text: string): void {
    if (!this.supported || !text.trim()) return;
    this.lastText = text;
    this.gen++;
    const myGen = this.gen;
    window.speechSynthesis.cancel();
    // pequeno atraso evita a corrida conhecida do Chrome entre cancel() e speak() no mesmo tick.
    window.setTimeout(() => {
      if (myGen !== this.gen) return;
      const utter = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utter; // ver comentário no campo: evita coleta prematura pelo GC
      utter.lang = "pt-BR";
      const voice = this.pickVoice();
      if (voice) utter.voice = voice;
      utter.rate = this.rate;
      utter.pitch = 1;
      utter.volume = this.volume;
      utter.onstart = () => { if (myGen === this.gen) this.setState("playing"); };
      utter.onend = () => { if (myGen === this.gen) { this.setState("idle"); this.currentUtterance = null; } };
      utter.onerror = () => { if (myGen === this.gen) { this.setState("idle"); this.currentUtterance = null; } };
      // Chrome às vezes deixa o motor de síntese "pausado" internamente após inatividade;
      // resume() antes de speak() é um no-op inofensivo quando não é preciso, e destrava quando é.
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utter);
    }, 60);
  }

  /** Indica se há um utterance retido (mantendo-o vivo e fora do alcance do GC). */
  get isSpeaking(): boolean {
    return this.currentUtterance !== null;
  }

  togglePlayPause(): void {
    if (!this.supported) return;
    if (this.state === "playing") {
      window.speechSynthesis.pause();
      this.setState("paused");
    } else if (this.state === "paused") {
      window.speechSynthesis.resume();
      this.setState("playing");
    }
  }

  stop(): void {
    if (!this.supported) return;
    this.gen++;
    window.speechSynthesis.cancel();
    this.currentUtterance = null;
    this.setState("idle");
  }

  /** Web Speech API não permite trocar o volume no meio da fala — reinicia a leitura atual com o novo volume. */
  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.state !== "idle" && this.lastText) this.speak(this.lastText);
  }

  /** Idem para a velocidade: só se aplica reiniciando a leitura atual, se houver uma em andamento. */
  setRate(r: number): void {
    this.rate = Math.min(2, Math.max(0.5, r));
    if (this.state !== "idle" && this.lastText) this.speak(this.lastText);
  }
}
