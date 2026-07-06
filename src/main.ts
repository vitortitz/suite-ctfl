/** Composition root: instancia infraestrutura, casos de uso e monta a aplicação. */
import "./presentation/styles.css";
import { CONFIG, CLOUD_ENABLED } from "./config";
import { CHAPTER_IDS } from "./domain/chapters";
import type { ChapterId } from "./domain/types";
import { SYLLABUS } from "./infrastructure/data/syllabus";
import { StaticQuestionSource } from "./infrastructure/data/staticQuestionSource";
import { createBrowserStore } from "./infrastructure/storage/kvStore";
import { LocalProgressRepository } from "./infrastructure/storage/localProgressRepository";
import { SupabaseProgressRepository, type SupabaseDbLike } from "./infrastructure/storage/supabaseProgressRepository";
import { SyncedProgressRepository } from "./infrastructure/storage/syncedProgressRepository";
import { LocalAuthProvider } from "./infrastructure/auth/localAuthProvider";
import { SupabaseAuthProvider, type SupabaseLike } from "./infrastructure/auth/supabaseAuthProvider";

import type { ProgressRepository } from "./domain/ports";
import { AuthService } from "./application/auth/authService";
import { StartStudySuite } from "./application/startStudySuite";
import { StartExam } from "./application/startExam";
import { BuildReinforcementSuite } from "./application/buildReinforcementSuite";
import { GradeSuite } from "./application/gradeSuite";
import { TrackStudyTime } from "./application/trackStudyTime";
import { ComputeProgress } from "./application/computeProgress";

import { App } from "./presentation/app";

/** Carrega o cliente Supabase sob demanda (do CDN) quando a nuvem está configurada. */
async function createSupabaseClient(): Promise<unknown | null> {
  if (!CLOUD_ENABLED) return null;
  try {
    const specifier = "https://esm.sh/@supabase/supabase-js@2";
    const mod: any = await import(/* @vite-ignore */ specifier);
    return mod.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  } catch (err) {
    console.warn("Nuvem indisponível; seguindo em modo local.", err);
    return null;
  }
}

async function boot(): Promise<void> {
  const store = createBrowserStore();
  const questions = new StaticQuestionSource();
  const questionCounts = Object.fromEntries(
    CHAPTER_IDS.map((id) => [id, questions.byChapter(id).length]),
  ) as Record<ChapterId, number>;
  const localProgress = new LocalProgressRepository(store);
  const supabase = await createSupabaseClient();

  const auth = supabase
    ? new AuthService(new SupabaseAuthProvider(supabase as SupabaseLike, window.location.origin))
    : new AuthService(new LocalAuthProvider(store));

  const progress: ProgressRepository = supabase
    ? new SyncedProgressRepository(localProgress, new SupabaseProgressRepository(supabase as SupabaseDbLike))
    : localProgress;

  const app = new App({
    auth,
    cloud: CLOUD_ENABLED,
    syllabus: SYLLABUS,
    questionCounts,
    startStudy: new StartStudySuite({ questions }),
    startExam: new StartExam({ questions }),
    reinforcement: new BuildReinforcementSuite({ questions, progress }),
    grade: new GradeSuite({ progress }),
    track: new TrackStudyTime({ progress }),
    computeProgress: new ComputeProgress({ progress }),
  });

  await app.mount(document.getElementById("app")!);
}

void boot();
