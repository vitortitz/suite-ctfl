// ARQUIVADO: implementação de leitura em voz alta via Web Speech API do navegador.
// Substituída por `googleCloudTts.ts` (Google Cloud TTS via proxy Supabase) por soar
// mais natural e não depender de vozes instaladas no sistema operacional do usuário.
// Não é mais importada pela UI — mantida aqui como referência / possível fallback futuro.
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

/** Uma entrada da lista de vozes pt/pt-BR disponíveis, para exibir num seletor. */
export interface VoiceOption {
  voiceURI: string;
  label: string;
}

/**
 * Pontua vozes disponíveis, priorizando pt-BR e um tom mais natural.
 *
 * Vozes locais (`localService: true`) funcionam offline; vozes remotas (ex.: "Google
 * português do Brasil" no Chrome) streamam áudio de um servidor e podem falhar em
 * silêncio total se a rede cair ou for bloqueada — por isso ainda somam pontos, mas não
 * dominam sozinhas. Voz "Desktop" legada do Windows soa robótica e perde pontos; vozes
 * "Natural/Neural/Online/Enhanced/Premium" (locais ou remotas) somam pontos por soarem
 * melhor. O resultado é: nem sempre a mais robusta, nem sempre a mais bonita — a que
 * equilibra os dois.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  let score: number;
  if (lang === "pt-br") score = 12;
  else if (lang.startsWith("pt")) score = 6;
  else return -1;
  if (v.localService) score += 4;
  const name = v.name.toLowerCase();
  if (/natural|neural|online|enhanced|premium/.test(name)) score += 5;
  if (/desktop/.test(name)) score -= 4;
  return score;
}

function rankedVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .map((v) => ({ v, s: scoreVoice(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

/**
 * Wrapper fino sobre a Web Speech API (`speechSynthesis`) para ler o resumo de um
 * capítulo em voz alta. Usa um contador de geração para descartar callbacks de
 * utterances supersedidas (cancel/speak em sequência é uma corrida conhecida da API).
 *
 * IMPORTANTE: `speak()` precisa rodar de forma síncrona dentro do gesto do usuário
 * (o handler de clique). Adiar a chamada com setTimeout quebra a "user activation"
 * exigida por políticas de autoplay em alguns navegadores — a fala falha em
 * silêncio, sem disparar `onstart` nem `onerror`, e a UI parece travada.
 */
export class TtsReader {
  readonly supported = typeof window !== "undefined" && "speechSynthesis" in window;
  state: TtsState = "idle";
  volume = 1;
  /** Velocidade da fala: 1 = ritmo normal da voz, ajustável pelo usuário (0.5×–2×). */
  rate = 1;
  /** voiceURI escolhido manualmente pelo usuário; null = deixar a heurística escolher. */
  voiceURI: string | null = null;

  /** Mensagem da última falha detectada (ex.: watchdog, após esgotar as tentativas automáticas). */
  lastError: string | null = null;

  private lastText = "";
  private gen = 0;
  private readonly listeners = new Set<(s: TtsState) => void>();
  private readonly errorListeners = new Set<(message: string) => void>();
  // Mantém uma referência forte ao utterance em voo: em Chrome, um SpeechSynthesisUtterance
  // sem referência externa pode ser coletado pelo GC antes (ou durante) a fala, cancelando-a
  // silenciosamente — por isso não basta criar a variável local dentro de speak().
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private watchdog: number | null = null;
  // Vozes já tentadas (e que falharam) para o pedido de fala atual — evita tentar a mesma
  // voz quebrada de novo e permite cair automaticamente para a próxima da lista.
  private failedVoiceURIs = new Set<string>();

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

  /** Registra um ouvinte para falhas (ex.: watchdog detectando que nenhum áudio começou, após as tentativas automáticas). */
  onError(cb: (message: string) => void): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  /** Lista as vozes pt/pt-BR disponíveis, da melhor para a pior segundo a heurística. */
  listVoices(): VoiceOption[] {
    return rankedVoices().map((v) => ({
      voiceURI: v.voiceURI,
      label: `${v.name}${v.localService ? "" : " (rede)"}`,
    }));
  }

  private setState(s: TtsState): void {
    this.state = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private clearWatchdog(): void {
    if (this.watchdog !== null) {
      window.clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  private pickVoice(): SpeechSynthesisVoice | undefined {
    const ranked = rankedVoices();
    if (this.voiceURI) {
      const chosen = ranked.find((v) => v.voiceURI === this.voiceURI);
      if (chosen && !this.failedVoiceURIs.has(chosen.voiceURI)) return chosen;
    }
    return ranked.find((v) => !this.failedVoiceURIs.has(v.voiceURI)) ?? ranked[0];
  }

  /**
   * Define a voz preferida pelo usuário (voiceURI); null volta para a escolha automática.
   * Sempre fala algo audível ao escolher — se já havia uma leitura em andamento, reinicia
   * o capítulo atual com a nova voz; se estava ocioso, toca uma frase curta de amostra.
   * Sem isso, escolher uma voz antes de clicar em "play" não dava nenhum retorno perceptível.
   */
  setVoicePreference(voiceURI: string | null): void {
    this.voiceURI = voiceURI;
    this.failedVoiceURIs.clear();
    if (this.state !== "idle" && this.lastText) this.speak(this.lastText);
    else this.speak("Esta é a voz selecionada.");
  }

  speak(text: string): void {
    if (!this.supported || !text.trim()) return;
    if (text !== this.lastText) this.failedVoiceURIs.clear();
    this.lastText = text;
    this.lastError = null;
    this.gen++;
    const myGen = this.gen;
    this.clearWatchdog();
    // Só cancela se algo já estiver falando/enfileirado — evita a corrida cancel()+speak()
    // no mesmo tick sem introduzir nenhum atraso antes do speak() principal (ver nota da classe).
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    const utter = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utter; // ver comentário no campo: evita coleta prematura pelo GC
    utter.lang = "pt-BR";
    const voice = this.pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = this.rate;
    utter.pitch = 1;
    utter.volume = this.volume;
    utter.onstart = () => {
      if (myGen !== this.gen) return;
      this.clearWatchdog();
      this.setState("playing");
    };
    utter.onend = () => {
      if (myGen !== this.gen) return;
      this.clearWatchdog();
      this.currentUtterance = null;
      this.setState("idle");
    };
    utter.onerror = (e) => {
      if (myGen !== this.gen) return;
      this.clearWatchdog();
      this.currentUtterance = null;
      if (voice) this.failedVoiceURIs.add(voice.voiceURI);
      if (this.tryNextVoice(myGen)) return;
      this.lastError = `Erro ao gerar áudio (${e.error ?? "desconhecido"}).`;
      // setState primeiro: o listener de estado limpa a mensagem de status ao voltar para
      // "idle", então o aviso de erro só deve chegar à UI depois disso, não antes.
      this.setState("idle");
      this.errorListeners.forEach((cb) => cb(this.lastError!));
    };
    window.speechSynthesis.speak(utter);
    // Otimista: onstart não é 100% confiável em todos os navegadores. Refletir "playing"
    // já aqui mantém a UI responsiva mesmo se o evento demorar ou nunca chegar a disparar.
    this.setState("playing");
    // Watchdog: se nem onstart nem onerror chegarem a disparar (voz de rede indisponível,
    // motor travado etc.), o navegador não avisa — sem isso, a UI ficaria presa em "Lendo…"
    // para sempre com nenhum áudio saindo. Depois de um tempo razoável, se o navegador não
    // reporta mais nada em andamento, tenta a próxima voz automaticamente antes de desistir.
    this.watchdog = window.setTimeout(() => {
      if (myGen !== this.gen) return;
      if (!window.speechSynthesis.speaking) {
        this.currentUtterance = null;
        if (voice) this.failedVoiceURIs.add(voice.voiceURI);
        if (this.tryNextVoice(myGen)) return;
        this.lastError = "Não foi possível reproduzir o áudio com nenhuma voz disponível.";
        this.setState("idle");
        this.errorListeners.forEach((cb) => cb(this.lastError!));
      }
    }, 4000);
  }

  /** Tenta a próxima voz ainda não tentada para o mesmo texto; retorna true se uma nova tentativa foi iniciada. */
  private tryNextVoice(myGen: number): boolean {
    if (myGen !== this.gen) return false;
    const hasUntried = rankedVoices().some((v) => !this.failedVoiceURIs.has(v.voiceURI));
    if (!hasUntried) return false;
    this.speak(this.lastText);
    return true;
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
    this.clearWatchdog();
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
