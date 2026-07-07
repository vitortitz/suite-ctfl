import type { ChapterSyllabus } from "@/infrastructure/data/syllabus";
import { CONFIG } from "@/config";

export type TtsState = "idle" | "loading" | "playing" | "paused";

/**
 * Extrai o texto falado de um capítulo: nome, introdução e cada seção (rótulo + conteúdo
 * sem HTML). NÃO é usada em tempo de execução pelo player — o conteúdo do syllabus é fixo,
 * então o áudio de cada capítulo já foi gerado uma vez (offline, por um admin) e publicado
 * como arquivo estático. Esta função só serve para regenerar esse áudio se o texto do
 * syllabus mudar; veja `supabase/functions/tts` e `docs/SETUP.md`.
 */
export function chapterToSpeechText(chapterName: string, chapter: ChapterSyllabus): string {
  const strip = (html: string): string => {
    // Itens de lista (<li>, <dt>/<dd>) e blocos (<p>, <div>) viram texto corrido sem
    // nenhuma pontuação entre eles quando só se lê o textContent — um parágrafo de lista
    // inteiro sem ponto final vira "uma frase só" longa demais, que o Google TTS rejeita
    // ("sentences that are too long"). Insere um ponto antes de cada fechamento de bloco
    // para garantir uma pausa/quebra de frase real entre os itens.
    const withBreaks = html.replace(/<\/(li|dt|dd|p|div)>/gi, ".$&");
    const div = document.createElement("div");
    div.innerHTML = withBreaks;
    return (div.textContent ?? "").replace(/\.{2,}/g, ".").replace(/\s+/g, " ").trim();
  };
  const parts = [`Capítulo: ${chapterName}.`, chapter.intro];
  for (const sec of chapter.sections) {
    parts.push(`${sec.label}.`, strip(sec.html));
  }
  return parts.join(" ");
}

function staticAudioUrl(chapterId: string): string {
  return `${CONFIG.supabaseUrl}/storage/v1/object/public/tts-static/${chapterId}.json`;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Toca o áudio pré-gerado (estático) de um capítulo, publicado em um bucket público do
 * Supabase Storage. Não chama nenhuma API de IA em tempo de execução — o navegador só
 * busca um arquivo JSON já pronto (como buscar qualquer outro asset estático) e o
 * reproduz com `<audio>`. Volume e velocidade são aplicados ao vivo via
 * `<audio>.volume`/`.playbackRate`, sem nenhuma requisição adicional.
 */
export class GoogleCloudTtsReader {
  readonly supported = typeof window !== "undefined" && typeof fetch !== "undefined" && typeof Audio !== "undefined";
  state: TtsState = "idle";
  volume = 1;
  rate = 1;
  lastError: string | null = null;

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

  /** Busca e toca o áudio estático do capítulo (`chapterId`, ex.: "chapter-1"). */
  async play(chapterId: string): Promise<void> {
    if (!this.supported || !chapterId) return;
    this.lastError = null;
    this.gen++;
    const myGen = this.gen;
    this.teardownQueue();
    this.setState("loading");

    let chunks: string[];
    try {
      const res = await fetch(staticAudioUrl(chapterId));
      if (myGen !== this.gen) return; // outra chamada substituiu esta enquanto aguardava
      if (!res.ok) throw new Error(`Áudio deste capítulo ainda não foi gerado (HTTP ${res.status}).`);
      const data = (await res.json()) as { chunks?: string[] };
      if (myGen !== this.gen) return;
      if (!Array.isArray(data.chunks) || data.chunks.length === 0) throw new Error("Arquivo de áudio vazio.");
      chunks = data.chunks;
    } catch (err) {
      if (myGen !== this.gen) return;
      this.fail(err instanceof Error ? err.message : "Não foi possível carregar o áudio.");
      return;
    }

    this.queue = chunks.map((base64) => {
      const url = URL.createObjectURL(base64ToBlob(base64, "audio/mpeg"));
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
      this.fail("Falha ao reproduzir o áudio.");
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

  /** Ao vivo: ajusta o volume do áudio atual, sem nenhuma requisição de rede. */
  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    for (const audio of this.queue) audio.volume = this.volume;
  }

  /** Ao vivo: ajusta a velocidade de reprodução, sem nenhuma requisição de rede. */
  setRate(r: number): void {
    this.rate = Math.min(2, Math.max(0.5, r));
    for (const audio of this.queue) audio.playbackRate = this.rate;
  }
}
