import type { Progress } from "@/domain/types";
import type { ProgressRepository } from "@/domain/ports";

function hasData(p: Progress): boolean {
  return p.attempts.length > 0 || Object.keys(p.studyByDate).length > 0;
}

/**
 * Repositório offline-first: sempre grava no cache local e espelha na nuvem
 * (melhor esforço). Na leitura, prefere a nuvem e atualiza o cache; se a nuvem
 * falhar, usa o local. No primeiro login em um dispositivo com dados locais e
 * nuvem vazia, semeia a nuvem a partir do local (last-write-wins simples).
 * O usuário visitante (guest) nunca toca a nuvem.
 */
export class SyncedProgressRepository implements ProgressRepository {
  constructor(
    private readonly local: ProgressRepository,
    private readonly cloud: ProgressRepository,
    private readonly guestId = "guest",
  ) {}

  async load(userId: string): Promise<Progress> {
    if (userId === this.guestId) return this.local.load(userId);
    try {
      const [remote, local] = await Promise.all([this.cloud.load(userId), this.local.load(userId)]);
      if (!hasData(remote) && hasData(local)) {
        await this.cloud.save(userId, local).catch(() => {});
        return local;
      }
      await this.local.save(userId, remote).catch(() => {});
      return remote;
    } catch (err) {
      console.warn("Falha ao ler da nuvem; usando cache local.", err);
      return this.local.load(userId);
    }
  }

  async save(userId: string, progress: Progress): Promise<void> {
    await this.local.save(userId, progress);
    if (userId === this.guestId) return;
    try {
      await this.cloud.save(userId, progress);
    } catch (err) {
      console.warn("Falha ao salvar na nuvem; alteração ficou em cache local.", err);
    }
  }
}
