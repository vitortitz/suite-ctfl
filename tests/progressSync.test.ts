import { describe, it, expect } from "vitest";
import type { Progress } from "@/domain/types";
import { emptyProgress } from "@/domain/types";
import { MemoryStore } from "@/infrastructure/storage/kvStore";
import { LocalProgressRepository } from "@/infrastructure/storage/localProgressRepository";
import {
  SupabaseProgressRepository,
  type SupabaseDbLike,
} from "@/infrastructure/storage/supabaseProgressRepository";
import { SyncedProgressRepository } from "@/infrastructure/storage/syncedProgressRepository";

/** Cliente Supabase falso: guarda linhas em memória e pode simular falha. */
class FakeSupabase implements SupabaseDbLike {
  rows = new Map<string, Progress>();
  fail = false;
  from(_table: string) {
    const rows = this.rows;
    const isDown = () => this.fail;
    return {
      select(_columns: string) {
        return {
          eq(_column: string, value: string) {
            return {
              async maybeSingle() {
                if (isDown()) return { data: null, error: { message: "offline" } };
                const r = rows.get(value);
                return { data: r ? { data: r } : null, error: null };
              },
            };
          },
        };
      },
      async upsert(row: Record<string, unknown>) {
        if (isDown()) return { error: { message: "offline" } };
        rows.set(row.user_id as string, row.data as Progress);
        return { error: null };
      },
    };
  }
}

function progressWith(attempts: number): Progress {
  const p = emptyProgress();
  for (let i = 0; i < attempts; i++) {
    p.attempts.push({ id: `a${i}`, mode: "study", dateISO: "", day: "2026-07-05", total: 1, correct: 1, pct: 100, durationSec: 1, items: [] });
  }
  return p;
}

describe("SupabaseProgressRepository", () => {
  it("faz round-trip de save e load", async () => {
    const repo = new SupabaseProgressRepository(new FakeSupabase());
    await repo.save("u1", progressWith(2));
    const loaded = await repo.load("u1");
    expect(loaded.attempts.length).toBe(2);
  });

  it("retorna progresso vazio quando não há linha", async () => {
    const repo = new SupabaseProgressRepository(new FakeSupabase());
    const loaded = await repo.load("desconhecido");
    expect(loaded.attempts.length).toBe(0);
  });

  it("propaga erro do backend", async () => {
    const db = new FakeSupabase();
    db.fail = true;
    const repo = new SupabaseProgressRepository(db);
    await expect(repo.load("u1")).rejects.toThrow("offline");
  });
});

describe("SyncedProgressRepository", () => {
  const build = () => {
    const db = new FakeSupabase();
    const local = new LocalProgressRepository(new MemoryStore());
    const cloud = new SupabaseProgressRepository(db);
    return { db, local, cloud, synced: new SyncedProgressRepository(local, cloud) };
  };

  it("visitante nunca toca a nuvem", async () => {
    const { db, synced } = build();
    await synced.save("guest", progressWith(3));
    expect(db.rows.size).toBe(0);
    const loaded = await synced.load("guest");
    expect(loaded.attempts.length).toBe(3);
  });

  it("grava no local e espelha na nuvem para usuário logado", async () => {
    const { db, local, synced } = build();
    await synced.save("u1", progressWith(2));
    expect((await local.load("u1")).attempts.length).toBe(2);
    expect(db.rows.get("u1")?.attempts.length).toBe(2);
  });

  it("no primeiro login semeia a nuvem a partir do cache local", async () => {
    const { db, local, synced } = build();
    await local.save("u1", progressWith(4)); // dados locais, nuvem vazia
    const loaded = await synced.load("u1");
    expect(loaded.attempts.length).toBe(4);
    expect(db.rows.get("u1")?.attempts.length).toBe(4); // semeou a nuvem
  });

  it("cai para o cache local quando a nuvem está fora do ar", async () => {
    const { db, local, synced } = build();
    await local.save("u1", progressWith(5));
    db.fail = true;
    const loaded = await synced.load("u1");
    expect(loaded.attempts.length).toBe(5);
  });
});
