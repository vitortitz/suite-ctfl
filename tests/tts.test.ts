// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function installFakeSpeechSynthesis() {
  const voices = [
    { name: "Microsoft Maria Desktop", lang: "pt-BR", localService: true },
    { name: "Google português do Brasil", lang: "pt-BR", localService: false },
    { name: "Samantha", lang: "en-US", localService: true },
  ] as SpeechSynthesisVoice[];
  const speak = vi.fn((u: FakeUtterance) => {
    setTimeout(() => u.onstart?.(), 0);
  });
  const cancel = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();
  (globalThis as any).SpeechSynthesisUtterance = FakeUtterance;
  (window as any).speechSynthesis = { getVoices: () => voices, speak, cancel, pause, resume };
  return { speak, cancel, pause, resume, voices };
}

describe("TtsReader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports supported=true when speechSynthesis exists, picks the Google pt-BR voice, and transitions idle -> playing", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    expect(tts.supported).toBe(true);

    const states: string[] = [];
    tts.onStateChange((s) => states.push(s));
    tts.speak("Olá, isto é um teste.");
    vi.advanceTimersByTime(70); // supera o atraso de 60ms antes do speak()
    expect(fake.speak).toHaveBeenCalledTimes(1);
    const utter = fake.speak.mock.calls[0][0] as FakeUtterance;
    expect(utter.voice?.name).toBe("Google português do Brasil");
    expect(utter.lang).toBe("pt-BR");

    vi.advanceTimersByTime(10); // dispara onstart agendado via setTimeout(0)
    expect(tts.state).toBe("playing");
    expect(states).toContain("playing");
    expect(fake.resume).toHaveBeenCalled();
  });

  it("mantém uma referência forte ao utterance em voo (evita coleta prematura pelo GC no Chrome)", () => {
    installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto que precisa ser falado por completo");
    vi.advanceTimersByTime(80);
    expect((tts as unknown as { currentUtterance: unknown }).currentUtterance).not.toBeNull();
  });

  it("pause/resume via togglePlayPause", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto");
    vi.advanceTimersByTime(80);
    expect(tts.state).toBe("playing");
    const resumeCallsBeforeToggle = fake.resume.mock.calls.length; // speak() já chama resume() defensivamente

    tts.togglePlayPause();
    expect(fake.pause).toHaveBeenCalledTimes(1);
    expect(tts.state).toBe("paused");

    tts.togglePlayPause();
    expect(fake.resume.mock.calls.length).toBe(resumeCallsBeforeToggle + 1);
    expect(tts.state).toBe("playing");
  });

  it("stop() cancels and resets to idle, invalidating in-flight utterances", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto");
    tts.stop();
    vi.advanceTimersByTime(100);
    expect(tts.state).toBe("idle");
    expect(fake.cancel).toHaveBeenCalled();
  });

  it("setVolume restarts the current utterance with the new volume while speaking", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto de teste");
    vi.advanceTimersByTime(80);
    expect(tts.state).toBe("playing");

    tts.setVolume(0.4);
    vi.advanceTimersByTime(80);
    expect(fake.speak).toHaveBeenCalledTimes(2);
    const secondUtter = fake.speak.mock.calls[1][0] as FakeUtterance;
    expect(secondUtter.volume).toBe(0.4);
  });

  it("setRate clamps to [0.5, 2] and restarts the current utterance with the new rate while speaking", () => {
    const fake = installFakeSpeechSynthesis();
    const tts = new TtsReader();
    tts.speak("texto de teste");
    vi.advanceTimersByTime(80);

    tts.setRate(1.5);
    vi.advanceTimersByTime(80);
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

  it("chapterToSpeechText strips HTML tags and includes chapter name + all section labels", () => {
    const name = CHAPTERS[1].name;
    const text = chapterToSpeechText(name, SYLLABUS[1]);
    expect(text).toContain("Capítulo: Fundamentos de Teste.");
    expect(text).toContain("O que é teste?");
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text.length).toBeGreaterThan(500);
  });
});
