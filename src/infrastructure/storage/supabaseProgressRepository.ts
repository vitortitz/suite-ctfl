import type { Progress } from "@/domain/types";
import { emptyProgress } from "@/domain/types";
import type { ProgressRepository } from "@/domain/ports";

/**
 * Subconjunto tipado do cliente Supabase usado por este repositório.
 * O cliente concreto é injetado no composition root (o mesmo usado pela auth).
 */
export interface SupabaseDbLike {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): Promise<{ data: { data: Progress } | null; error: { message: string } | null }>;
      };
    };
    upsert(
      row: Record<string, unknown>,
      options?: { onConflict?: string },
    ): Promise<{ error: { message: string } | null }>;
  };
}

/**
 * Persiste o progresso do usuário numa tabela `progress` do Supabase
 * (uma linha por usuário, coluna `data` em JSONB). Ver docs/SETUP.md para o SQL.
 */
export class SupabaseProgressRepository implements ProgressRepository {
  constructor(
    private readonly db: SupabaseDbLike,
    private readonly table = "progress",
  ) {}

  async load(userId: string): Promise<Progress> {
    const { data, error } = await this.db.from(this.table).select("data").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return emptyProgress();
    return { ...emptyProgress(), ...data.data };
  }

  async save(userId: string, progress: Progress): Promise<void> {
    const { error } = await this.db
      .from(this.table)
      .upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }
}
