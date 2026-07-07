// ARQUIVADO: leitura em voz alta via Gemini TTS (API preview, native audio output),
// proxiada pela function `supabase/functions/tts-gemini-archived`. Voltamos para
// `googleCloudTts.ts` (Google Cloud Text-to-Speech, API estável) por preferência do
// projeto. Não é importada pela UI — mantida aqui como referência / possível uso futuro.
import type { ChapterSyllabus } from "@/infrastructure/data/syllabus";
import { CONFIG } from "@/config";

export type TtsState = "idle" | "loading" | "playing" | "paused";

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

export interface TtsVoiceOption {
  id: string;
  label: string;
}

/**
 * Catálogo curado de vozes do Gemini TTS (nomes fixos definidos pela API, sem variante
 * por idioma — o modelo detecta o idioma pelo texto). São vozes neurais nativas, mais
 * naturais que as opções do sistema operacional ou da API clássica de Cloud TTS.
 */
export const GEMINI_TTS_VOICES: TtsVoiceOption[] = [
  { id: "Kore", label: "Kore — firme e clara (recomendada)" },
  { id: "Aoede", label: "Aoede — suave" },
  { id: "Puck", label: "Puck — animada" },
  { id: "Charon", label: "Charon — grave" },
  { id: "Fenrir", label: "Fenrir — enérgica" },
  { id: "Leda", label: "Leda — jovem" },
  { id: "Zephyr", label: "Zephyr — leve" },
];
export const DEFAULT_VOICE_ID = GEMINI_TTS_VOICES[0].id;

function ttsEndpoint(): string {
  return `${CONFIG.supabaseUrl}/functions/v1/tts-gemini-archived`;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Cliente do proxy de Gemini TTS (Supabase Edge Function em `supabase/functions/tts`).
 * A API key do Gemini nunca chega ao navegador — fica só no servidor da function.
 *
 * Reproduz o áudio com `<audio>` em vez da Web Speech API: isso permite trocar volume e
 * velocidade *ao vivo*, sem reemitir a fala (`<audio>.volume`/`.playbackRate` bastam —
 * ver também `googleCloudTtsArchived.ts`, que usa a mesma abordagem).
 */
export class GeminiTtsReader {
  readonly supported = typeof window !== "undefined" && typeof fetch !== "undefined" && typeof Audio !== "undefined";
  state: TtsState = "idle";
  volume = 1;
  /** Velocidade de reprodução: 1 = normal. Aplicada via `<audio>.playbackRate`, sem custo de rede. */
  rate = 1;
  voiceId: string = DEFAULT_VOICE_ID;
  lastError: string | null = null;

  private lastText = "";
  private gen = 0;
  private queue: HTMLAudioElement[] = [];
  private queueIndex = 0;
  private readonly listeners = new Set<(s: TtsState) => void>();
  private readonly errorListeners = new Set<(message: string) => void>();

  onStateChange(cb: (s: TtsState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onError(cb: (message: string) => void): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  private setState(s: TtsState): void {
    this.state = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private fail(message: string): void {
    this.lastError = message;
    this.setState("idle");
    this.errorListeners.forEach((cb) => cb(message));
  }

  private teardownQueue(): void {
    for (const audio of this.queue) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      const url = audio.dataset.blobUrl;
      if (url) URL.revokeObjectURL(url);
    }
    this.queue = [];
    this.queueIndex = 0;
  }

  async speak(text: string): Promise<void> {
    if (!this.supported || !text.trim()) return;
    this.lastText = text;
    this.lastError = null;
    this.gen++;
    const myGen = this.gen;
    this.teardownQueue();
    this.setState("loading");

    let chunks: string[];
    try {
      const res = await fetch(ttsEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${CONFIG.supabaseAnonKey}` },
        body: JSON.stringify({ text, voiceName: this.voiceId }),
      });
      if (myGen !== this.gen) return; // outra chamada substituiu esta enquanto aguardava
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `Falha ao gerar áudio (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as { chunks?: string[] };
      if (myGen !== this.gen) return;
      if (!Array.isArray(data.chunks) || data.chunks.length === 0) throw new Error("Resposta vazia do servidor de áudio.");
      chunks = data.chunks;
    } catch (err) {
      if (myGen !== this.gen) return;
      this.fail(err instanceof Error ? err.message : "Não foi possível gerar o áudio.");
      return;
    }

    this.queue = chunks.map((base64) => {
      const url = URL.createObjectURL(base64ToBlob(base64, "audio/wav"));
      const audio = new Audio(url);
      audio.dataset.blobUrl = url;
      audio.volume = this.volume;
      audio.playbackRate = this.rate;
      return audio;
    });
    this.queueIndex = 0;
    this.playCurrent(myGen);
  }

  private playCurrent(myGen: number): void {
    if (myGen !== this.gen) return;
    const audio = this.queue[this.queueIndex];
    if (!audio) {
      this.setState("idle");
      return;
    }
    audio.onended = () => {
      if (myGen !== this.gen) return;
      this.queueIndex++;
      this.playCurrent(myGen);
    };
    audio.onerror = () => {
      if (myGen !== this.gen) return;
      this.fail("Falha ao reproduzir o áudio gerado.");
    };
    audio
      .play()
      .then(() => {
        if (myGen === this.gen) this.setState("playing");
      })
      .catch(() => {
        if (myGen === this.gen) this.fail("O navegador bloqueou a reprodução do áudio.");
      });
  }

  togglePlayPause(): void {
    const audio = this.queue[this.queueIndex];
    if (!audio) return;
    if (this.state === "playing") {
      audio.pause();
      this.setState("paused");
    } else if (this.state === "paused") {
      void audio.play();
      this.setState("playing");
    }
  }

  stop(): void {
    this.gen++;
    this.teardownQueue();
    this.setState("idle");
  }

  /** Ao vivo: ajusta o volume do áudio atual sem precisar gerar tudo de novo. */
  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    for (const audio of this.queue) audio.volume = this.volume;
  }

  /** Ao vivo: ajusta a velocidade de reprodução sem precisar gerar tudo de novo. */
  setRate(r: number): void {
    this.rate = Math.min(2, Math.max(0.5, r));
    for (const audio of this.queue) audio.playbackRate = this.rate;
  }

  /** Troca a voz. Sempre toca algo audível: reinicia o capítulo atual se já estava lendo,
   * ou uma frase curta de amostra se estava ocioso (senão a troca não daria retorno nenhum). */
  setVoicePreference(voiceId: string): void {
    this.voiceId = voiceId;
    if (this.state !== "idle" && this.lastText) void this.speak(this.lastText);
    else void this.speak("Esta é a voz selecionada.");
  }
}
