// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleCloudTtsReader, chapterToSpeechText } from "@/presentation/googleCloudTts";
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
// aqui, já que o Audio é totalmente mockado (o MP3 já vem pronto do arquivo estático).
const FAKE_B64 = btoa("fake-mp3-bytes");

describe("GoogleCloudTtsReader (áudio estático pré-gerado, sem chamada de API em tempo real)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("supported é true quando fetch/Audio existem", () => {
    installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GoogleCloudTtsReader();
    expect(tts.supported).toBe(true);
  });

  it("play(): busca o JSON estático do capítulo (GET simples, sem body/Authorization), toca e vira 'playing'", async () => {
    const { audios, fetchMock } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GoogleCloudTtsReader();
    const states: string[] = [];
    tts.onStateChange((s) => states.push(s));

    const promise = tts.play("chapter-1");
    expect(tts.state).toBe("loading");
    await promise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${CONFIG.supabaseUrl}/storage/v1/object/public/tts-static/chapter-1.json`);
    expect(init).toBeUndefined(); // GET puro: nenhum method/body/Authorization — é um asset público estático

    expect(audios).toHaveLength(1);
    expect(tts.state).toBe("playing");
    expect(states).toContain("loading");
    expect(states).toContain("playing");
  });

  it("toca múltiplos pedaços em sequência (onended avança para o próximo)", async () => {
    const { audios } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64, FAKE_B64, FAKE_B64])) });
    const tts = new GoogleCloudTtsReader();
    await tts.play("chapter-5");

    expect(audios).toHaveLength(3);
    expect(tts.state).toBe("playing");

    audios[0].onended?.();
    expect(audios[1].paused).toBe(false);
    expect(tts.state).toBe("playing");

    audios[1].onended?.();
    expect(audios[2].paused).toBe(false);

    audios[2].onended?.();
    expect(tts.state).toBe("idle"); // acabou a fila
  });

  it("HTTP não-ok (ex.: capítulo ainda não publicado): reporta erro e volta para idle", async () => {
    installFakes({ fetchImpl: vi.fn(async () => ({ ok: false, status: 404 }) as Response) });
    const tts = new GoogleCloudTtsReader();
    const errors: string[] = [];
    tts.onError((msg) => errors.push(msg));

    await tts.play("chapter-1");

    expect(tts.state).toBe("idle");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("404");
  });

  it("falha de rede (fetch rejeita): reporta erro e volta para idle", async () => {
    installFakes({
      fetchImpl: vi.fn(async () => {
        throw new Error("Failed to fetch");
      }),
    });
    const tts = new GoogleCloudTtsReader();
    const errors: string[] = [];
    tts.onError((msg) => errors.push(msg));

    await tts.play("chapter-1");

    expect(tts.state).toBe("idle");
    expect(errors[0]).toContain("Failed to fetch");
  });

  it("uma chamada mais nova descarta o resultado de uma chamada anterior ainda pendente (corrida ao trocar de capítulo rápido)", async () => {
    let resolveFirst!: (v: Response) => void;
    const firstPromise = new Promise<Response>((r) => (resolveFirst = r));
    const fetchMock = vi.fn().mockReturnValueOnce(firstPromise).mockReturnValueOnce(Promise.resolve(okResponse([FAKE_B64])));
    const { audios } = installFakes({ fetchImpl: fetchMock as unknown as typeof fetch });
    const tts = new GoogleCloudTtsReader();

    const p1 = tts.play("chapter-1"); // fica pendente
    const p2 = tts.play("chapter-2"); // resolve antes do primeiro
    await p2;
    expect(audios).toHaveLength(1); // só o segundo pedido tocou algo

    resolveFirst(okResponse([FAKE_B64, FAKE_B64]));
    await p1;
    expect(audios).toHaveLength(1); // a resposta tardia do primeiro pedido foi ignorada
  });

  it("togglePlayPause pausa/retoma o áudio atual", async () => {
    const { audios } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GoogleCloudTtsReader();
    await tts.play("chapter-1");
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
    const tts = new GoogleCloudTtsReader();
    await tts.play("chapter-1");

    tts.stop();

    expect(tts.state).toBe("idle");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("setVolume/setRate aplicam ao vivo no áudio atual, sem nenhuma nova busca de rede", async () => {
    const { audios, fetchMock } = installFakes({ fetchImpl: vi.fn(async () => okResponse([FAKE_B64])) });
    const tts = new GoogleCloudTtsReader();
    await tts.play("chapter-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    tts.setVolume(0.3);
    tts.setRate(1.5);

    expect(audios[0].volume).toBe(0.3);
    expect(audios[0].playbackRate).toBe(1.5);
    expect(fetchMock).toHaveBeenCalledTimes(1); // nenhuma nova requisição — só ajusta o <audio> já carregado
  });

  it("chapterToSpeechText (usada só pelo script de regeneração, não pelo player) insere pontuação entre itens de lista para o Google TTS não rejeitar frases longas demais", () => {
    const name = CHAPTERS[1].name;
    const text = chapterToSpeechText(name, SYLLABUS[1]);
    expect(text).toContain("Capítulo: Fundamentos de Teste.");
    expect(text).toContain("O que é teste?");
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text.length).toBeGreaterThan(500);
  });
});
