// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { TtsReader, chapterToSpeechText } from "@/presentation/tts";
import { SYLLABUS } from "@/infrastructure/data/syllabus";
import { CHAPTERS } from "@/domain/chapters";

class FakeUtterance {
  lang = "";
  voice: any = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  constructor(public text: string) {}
}

// Ordenado de propósito do "pior" para o "melhor" candidato, para que os testes de
// ranking não deem certo só por sorte de ordem original do array.
const FAKE_VOICES = [
  { voiceURI: "desktop-maria", name: "Microsoft Maria Desktop", lang: "pt-BR", localService: true }, // local, mas "Desktop" (robótica)
  { voiceURI: "google-ptbr", name: "Google português do Brasil", lang: "pt-BR", localService: false }, // soa bem, mas é de rede
  { voiceURI: "en-us-samantha", name: "Samantha", lang: "en-US", localService: true }, // idioma errado, deve ser excluída
  { voiceURI: "natural-maria", name: "Microsoft Maria Natural", lang: "pt-BR", localService: true }, // local E natural: a melhor opção
] as SpeechSynthesisVoice[];

function installFakeSpeechSynthesis(voices: SpeechSynthesisVoice[] = FAKE_VOICES) {
  const fake = {
    speaking: false,
    pending: false,
    getVoices: () => voices,
    speak: vi.fn((_u: FakeUtterance) => {
      fake.speaking = true;
    }),
    cancel: vi.fn(() => {
      fake.speaking = false;
      fake.pending = false;
    }),
    pause: vi.fn(),
    resume: vi.fn(),
  };
  (globalThis as any).SpeechSynthesisUtterance = FakeUtterance;
  (window as any).speechSynthesis = fake;
  return fake;
}

describe("TtsReader", () => {
  it("reports supported=true, prefers a LOCAL + NATURAL pt-BR voice over 'Desktop' (robótica) or remote/network ones, and reflects 'playing' synchronously on speak()", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    expect(tts.supported).toBe(true);

    const states: string[] = [];
    tts.onStateChange((s) => states.push(s));
    tts.speak("Olá, isto é um teste.");

    // Precisa acontecer de forma síncrona com o clique do usuário — não deve depender
    // de nenhum timer nem de o navegador disparar onstart (nem todos disparam de forma confiável).
    expect(fake.speak).toHaveBeenCalledTimes(1);
    expect(tts.state).toBe("playing");
    expect(states).toContain("playing");

    const utter = fake.speak.mock.calls[0][0] as FakeUtterance;
    expect(utter.voice?.name).toBe("Microsoft Maria Natural");
    expect(utter.lang).toBe("pt-BR");
  });

  it("listVoices exclui idiomas que não são pt e ordena da melhor para a pior segundo a heurística", () => {
    installFakeSpeechSynthesis();
    const tts = new TtsReader();
    const names = tts.listVoices().map((v) => v.label.replace(" (rede)", ""));
    expect(names).toEqual(["Microsoft Maria Natural", "Microsoft Maria Desktop", "Google português do Brasil"]);
    expect(tts.listVoices().find((v) => v.label.includes("Google"))?.label).toContain("(rede)");
  });

  it("setVoicePreference força uma voz específica, ignorando a heurística", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.setVoicePreference("desktop-maria");
    tts.speak("texto");
    const utter = fake.speak.mock.calls[1][0] as FakeUtterance; // [0] é a amostra tocada pela própria setVoicePreference
    expect(utter.voice?.name).toBe("Microsoft Maria Desktop");
  });

  it("setVoicePreference sempre fala algo audível ao escolher, mesmo se nada estava tocando (senão a troca não dava nenhum retorno perceptível)", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    expect(tts.state).toBe("idle");

    tts.setVoicePreference("google-ptbr");

    expect(fake.speak).toHaveBeenCalledTimes(1); // toca uma frase de amostra mesmo estando ocioso
    expect(tts.state).toBe("playing");
    const utter = fake.speak.mock.calls[0][0] as FakeUtterance;
    expect(utter.voice?.name).toBe("Google português do Brasil");
  });

  it("setVoicePreference reinicia a leitura atual (não uma amostra) quando já havia algo tocando", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("resumo do capítulo inteiro");
    expect(fake.speak).toHaveBeenCalledTimes(1);

    tts.setVoicePreference("desktop-maria");

    expect(fake.speak).toHaveBeenCalledTimes(2);
    const utter = fake.speak.mock.calls[1][0] as FakeUtterance;
    expect(utter.text).toBe("resumo do capítulo inteiro");
    expect(utter.voice?.name).toBe("Microsoft Maria Desktop");
  });

  it("cai automaticamente para a próxima voz quando a escolhida falha (onerror), antes de reportar erro final", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    const errors: string[] = [];
    tts.onError((msg) => errors.push(msg));

    tts.speak("texto");
    const firstUtter = fake.speak.mock.calls[0][0] as FakeUtterance;
    expect(firstUtter.voice?.name).toBe("Microsoft Maria Natural");

    firstUtter.onerror?.({ error: "synthesis-failed" });

    // Tentou de novo automaticamente com a segunda melhor voz, sem reportar erro ainda.
    expect(fake.speak).toHaveBeenCalledTimes(2);
    expect(errors).toHaveLength(0);
    expect(tts.state).toBe("playing");
    const secondUtter = fake.speak.mock.calls[1][0] as FakeUtterance;
    expect(secondUtter.voice?.name).toBe("Microsoft Maria Desktop");
  });

  it("não chama cancel() no primeiro speak() (nada em andamento) — evita a corrida cancel()+speak() sem atrasar a fala", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("primeiro texto");
    expect(fake.cancel).not.toHaveBeenCalled();
  });

  it("cancela a fala anterior antes de iniciar uma nova, quando já há algo em andamento", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("primeiro texto");
    tts.speak("segundo texto");
    expect(fake.cancel).toHaveBeenCalledTimes(1);
    expect(fake.speak).toHaveBeenCalledTimes(2);
  });

  it("mantém uma referência forte ao utterance em voo (evita coleta prematura pelo GC no Chrome)", () => {
    installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto que precisa ser falado por completo");
    expect((tts as unknown as { currentUtterance: unknown }).currentUtterance).not.toBeNull();
  });

  it("pause/resume via togglePlayPause", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto");
    expect(tts.state).toBe("playing");

    tts.togglePlayPause();
    expect(fake.pause).toHaveBeenCalledTimes(1);
    expect(tts.state).toBe("paused");

    tts.togglePlayPause();
    expect(fake.resume).toHaveBeenCalledTimes(1);
    expect(tts.state).toBe("playing");
  });

  it("stop() cancels and resets to idle, invalidating in-flight utterances", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto");
    tts.stop();
    expect(tts.state).toBe("idle");
    expect(fake.cancel).toHaveBeenCalled();
  });

  it("setVolume restarts the current utterance with the new volume while speaking", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto de teste");
    expect(tts.state).toBe("playing");

    tts.setVolume(0.4);
    expect(fake.speak).toHaveBeenCalledTimes(2);
    const secondUtter = fake.speak.mock.calls[1][0] as FakeUtterance;
    expect(secondUtter.volume).toBe(0.4);
  });

  it("setRate clamps to [0.5, 2] and restarts the current utterance with the new rate while speaking", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto de teste");

    tts.setRate(1.5);
    expect(fake.speak).toHaveBeenCalledTimes(2);
    expect((fake.speak.mock.calls[1][0] as FakeUtterance).rate).toBe(1.5);

    tts.setRate(10); // acima do máximo permitido
    expect(tts.rate).toBe(2);
    tts.setRate(0.1); // abaixo do mínimo permitido
    expect(tts.rate).toBe(0.5);
  });

  it("setRate apenas atualiza o valor quando não há leitura em andamento (não inicia a fala sozinho)", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.setRate(1.25);
    expect(tts.rate).toBe(1.25);
    expect(fake.speak).not.toHaveBeenCalled();
  });

  // Só uma voz disponível nesses dois testes: sem candidata alguma para o fallback
  // automático tentar, então a primeira falha já deve ser a falha final reportada.
  const ONLY_VOICE = [FAKE_VOICES[0]];

  it("onerror reseta para idle e notifica os ouvintes de erro com uma mensagem, quando não há mais nenhuma voz para tentar", () => {
    const fake = installFakeSpeechSynthesis(ONLY_VOICE);
    const tts = new TtsReader();
    const errors: string[] = [];
    tts.onError((msg) => errors.push(msg));
    tts.speak("texto");
    expect(tts.state).toBe("playing");

    const utter = fake.speak.mock.calls[0][0] as FakeUtterance;
    utter.onerror?.({ error: "network" });

    expect(tts.state).toBe("idle");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("network");
    expect(tts.lastError).toBe(errors[0]);
  });

  it("o watchdog detecta quando o navegador nunca chega a falar de verdade (voz de rede falhando em silêncio) e volta para idle com uma mensagem de erro, quando não há mais nenhuma voz para tentar", () => {
    vi.useFakeTimers();
    try {
      const fake = installFakeSpeechSynthesis(ONLY_VOICE);
      // Simula uma falha totalmente silenciosa: speak() é chamado, mas o navegador nunca
      // reporta "speaking" nem dispara onstart/onerror — exatamente o caso de uma voz de
      // rede indisponível.
      fake.speak.mockImplementation(() => {});
      const tts = new TtsReader();
      const errors: string[] = [];
      tts.onError((msg) => errors.push(msg));

      tts.speak("texto");
      expect(tts.state).toBe("playing"); // otimista, ainda sem confirmação do navegador

      vi.advanceTimersByTime(4100);
      expect(tts.state).toBe("idle");
      expect(errors).toHaveLength(1);
      expect(tts.lastError).toContain("Não foi possível reproduzir");
    } finally {
      vi.useRealTimers();
    }
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
