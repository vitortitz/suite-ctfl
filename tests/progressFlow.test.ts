import { describe, it, expect } from "vitest";
import { MemoryStore } from "@/infrastructure/storage/kvStore";
import { LocalProgressRepository } from "@/infrastructure/storage/localProgressRepository";
import { StaticQuestionSource } from "@/infrastructure/data/staticQuestionSource";
import { StartStudySuite } from "@/application/startStudySuite";
import { GradeSuite } from "@/application/gradeSuite";
import { TrackStudyTime } from "@/application/trackStudyTime";
import { ComputeProgress } from "@/application/computeProgress";
import { seededRng } from "@/domain/random";
import type { Clock } from "@/domain/ports";

const clock: Clock = { now: () => new Date(2026, 6, 5, 10, 0, 0) };
const USER = "guest";

describe("Fluxo de progresso (aplicação + infra)", () => {
  it("gradua uma suíte, registra tempo e deriva o painel", async () => {
    const progress = new LocalProgressRepository(new MemoryStore());
    const questions = new StaticQuestionSource();

    const suite = new StartStudySuite({ questions, rng: seededRng(1) }).execute([4], 5);
    expect(suite.questions.length).toBe(5);

    // responde tudo corretamente usando a posição correta conhecida
    const answers = suite.questions.map((sq) => sq.correctPosition);
    const { attempt } = await new GradeSuite({ progress, clock }).execute(USER, suite, answers, 120);
    expect(attempt.pct).toBe(100);

    await new TrackStudyTime({ progress, clock }).addSeconds(USER, 300);

    const dash = await new ComputeProgress({ progress, clock }).execute(USER);
    expect(dash.attempts).toBe(1);
    expect(dash.streak).toBe(1);
    expect(dash.todayStudySec).toBe(300);
    const cap4 = dash.mastery.find((m) => m.chapter === 4)!;
    expect(cap4.pct).toBe(100);
    expect(dash.last14.length).toBe(14);
    expect(dash.last14[13].active).toBe(true); // hoje
  });

  it("guarda o melhor resultado do modo exame", async () => {
    const progress = new LocalProgressRepository(new MemoryStore());
    const questions = new StaticQuestionSource();
    const suite = new StartStudySuite({ questions, rng: seededRng(2) }).execute([1], 4);
    const examLike = { ...suite, mode: "exam" as const };
    const half = suite.questions.map((sq, i) => (i % 2 === 0 ? sq.correctPosition : null));
    await new GradeSuite({ progress, clock }).execute(USER, examLike, half, 60);
    const dash = await new ComputeProgress({ progress, clock }).execute(USER);
    expect(dash.examBestPct).toBe(50);
  });
});
