// ARQUIVADO junto com src/presentation/geminiTtsArchived.ts — mantido rodando no CI só
// para garantir que o código arquivado continua compilando/funcionando, caso seja
// revivido no futuro. Não cobre nenhum caminho usado pela UI atual (veja googleCloudTts.test.ts).
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiTtsReader, chapterToSpeechText, GEMINI_TTS_VOICES, DEFAULT_VOICE_ID } from "@/presentation/geminiTtsArchived";
import { SYLLABUS } from "@/infrastructure/data/syllabus";
import { CHAPTERS } from "@/domain/chapters";
import { CONFIG } from "@/config";

class FakeAudio {
  volume = 1;
  playbackRate = 1;
  paused = true;
  dataset: Record<string, string> = {};
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playImpl: () => Promise<void> = () => Promise.resolve();
  constructor(public src: string) {}
  play(): Promise<void> {
    this.paused = false;
    return this.playImpl();
  }
  pause(): void {
    this.paused = true;
  }
}

function installFakes(opts: { fetchImpl?: typeof fetch; playImpl?: () => Promise<void> } = {}) {
  const audios: FakeAudio[] = [];
  (globalThis as any).Audio = vi.fn((src: string) => {
    const a = new FakeAudio(src);
    if (opts.playImpl) a.playImpl = opts.playImpl;
    audios.push(a);
    return a;
  });
  (globalThis as any).URL.createObjectURL = vi.fn(() => `blob:fake-${audios.length}`);
  (globalThis as any).URL.revokeObjectURL = vi.fn();
  const fetchMock = opts.fetchImpl ?? vi.fn();
  (globalThis as any).fetch = fetchMock;
  return { audios, fetchMock: fetchMock as ReturnType<typeof vi.fn> };
}

function okResponse(chunks: string[]) {
  return { ok: true, json: async () => ({ chunks }) } as Response;
}

// base64 de amostra só para preencher o campo — o conteúdo real do áudio não importa
// aqui, já que o Audio é totalmente mockado (o WAV já vem pronto do servidor/proxy).
const FAKE_B64 = btoa("fake-wav-bytes");

describe("GeminiTtsReader", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("supported é true quando fetch/Audio existem", () => {
    installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GeminiTtsReader();
    expect(tts.supported).toBe(true);
  });

  it("speak(): vai para 'loading', chama o proxy com o texto/voz certos e headers de auth, depois toca e vira 'playing'", async () => {
    const { audios, fetchMock } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GeminiTtsReader();
    const states: string[] = [];
    tts.onStateChange((s) => states.push(s));

    const promise = tts.speak("Olá, mundo.");
    expect(tts.state).toBe("loading");

    await promise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${CONFIG.supabaseUrl}/functions/v1/tts-gemini-archived`);
    expect(init.headers.Authorization).toBe(`Bearer ${CONFIG.supabaseAnonKey}`);
    expect(JSON.parse(init.body)).toEqual({ text: "Olá, mundo.", voiceName: DEFAULT_VOICE_ID });

    expect(audios).toHaveLength(1);
    expect(tts.state).toBe("playing");
    expect(states).toContain("loading");
    expect(states).toContain("playing");
  });

  it("toca múltiplos pedaços em sequência (onended avança para o próximo)", async () => {
    const { audios } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64, FAKE_B64, FAKE_B64])) });
    const tts = new GeminiTtsReader();
    await tts.speak("texto longo dividido em pedaços");

    expect(audios).toHaveLength(3);
    expect(tts.state).toBe("playing");

    audios[0].onended?.();
    expect(audios[1].paused).toBe(false); // segundo pedaço começou a tocar
    expect(tts.state).toBe("playing");

    audios[1].onended?.();
    expect(audios[2].paused).toBe(false);

    audios[2].onended?.();
    expect(tts.state).toBe("idle"); // acabou a fila
  });

  it("onerror da resposta HTTP: reporta a mensagem de erro do servidor e volta para idle", async () => {
    installFakes({
      fetchImpl: vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: "cota excedida" }) }) as Response),
    });
    const tts = new GeminiTtsReader();
    const errors: string[] = [];
    tts.onError((msg) => errors.push(msg));

    await tts.speak("texto");

    expect(tts.state).toBe("idle");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("cota excedida");
    expect(tts.lastError).toBe(errors[0]);
  });

  it("falha de rede (fetch rejeita): reporta erro e volta para idle", async () => {
    installFakes({ fetchImpl: vi.fn(async () => { throw new Error("Failed to fetch"); }) });
    const tts = new GeminiTtsReader();
    const errors: string[] = [];
    tts.onError((msg) => errors.push(msg));

    await tts.speak("texto");

    expect(tts.state).toBe("idle");
    expect(errors[0]).toContain("Failed to fetch");
  });

  it("uma chamada mais nova descarta o resultado de uma chamada anterior ainda pendente (corrida)", async () => {
    let resolveFirst!: (v: Response) => void;
    const firstPromise = new Promise<Response>((r) => (resolveFirst = r));
    const fetchMock = vi.fn().mockReturnValueOnce(firstPromise).mockReturnValueOnce(Promise.resolve(okResponse([FAKE_B64])));
    const { audios } = installFakes({ fetchImpl: fetchMock as unknown as typeof fetch });
    const tts = new GeminiTtsReader();

    const p1 = tts.speak("primeiro"); // fica pendente
    const p2 = tts.speak("segundo"); // resolve antes do primeiro
    await p2;
    expect(audios).toHaveLength(1); // só o segundo pedido tocou algo

    resolveFirst(okResponse([FAKE_B64, FAKE_B64]));
    await p1;
    expect(audios).toHaveLength(1); // a resposta tardia do primeiro pedido foi ignorada
  });

  it("togglePlayPause pausa/retoma o áudio atual", async () => {
    const { audios } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GeminiTtsReader();
    await tts.speak("texto");
    expect(tts.state).toBe("playing");

    tts.togglePlayPause();
    expect(audios[0].paused).toBe(true);
    expect(tts.state).toBe("paused");

    tts.togglePlayPause();
    expect(audios[0].paused).toBe(false);
    expect(tts.state).toBe("playing");
  });

  it("stop() pausa tudo, revoga as blob URLs e volta para idle", async () => {
    installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64, FAKE_B64])) });
    const tts = new GeminiTtsReader();
    await tts.speak("texto");

    tts.stop();

    expect(tts.state).toBe("idle");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("setVolume/setRate aplicam ao vivo no áudio atual, sem nenhuma nova chamada de rede", async () => {
    const { audios, fetchMock } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GeminiTtsReader();
    await tts.speak("texto");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    tts.setVolume(0.3);
    tts.setRate(1.5);

    expect(audios[0].volume).toBe(0.3);
    expect(audios[0].playbackRate).toBe(1.5);
    expect(fetchMock).toHaveBeenCalledTimes(1); // nenhuma nova requisição
  });

  it("setVoicePreference toca uma amostra quando ocioso, e reinicia o capítulo quando já estava tocando", async () => {
    const { fetchMock } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GeminiTtsReader();

    tts.setVoicePreference("Puck");
    await Promise.resolve(); // deixa a promise interna de speak() assentar
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe("Esta é a voz selecionada.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).voiceName).toBe("Puck");

    await tts.speak("resumo do capítulo");
    tts.setVoicePreference("Charon");
    await new Promise((r) => setTimeout(r, 0));
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
    expect(JSON.parse(lastCall[1].body).text).toBe("resumo do capítulo");
    expect(JSON.parse(lastCall[1].body).voiceName).toBe("Charon");
  });

  it("GEMINI_TTS_VOICES tem um catálogo não vazio e DEFAULT_VOICE_ID é um dos ids listados", () => {
    expect(GEMINI_TTS_VOICES.length).toBeGreaterThan(0);
    expect(GEMINI_TTS_VOICES.some((v) => v.id === DEFAULT_VOICE_ID)).toBe(true);
  });

  it("chapterToSpeechText strips HTML tags and includes chapter name + all section labels", () => {
    const name = CHAPTERS[1].name;
    const text = chapterToSpeechText(name, SYLLABUS[1]);
    expect(text).toContain("Capítulo: Fundamentos de Teste.");
    expect(text).toContain("O que é teste?");
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text.length).toBeGreaterThan(500);
  });
});
