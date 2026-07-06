import type { Progress } from "@/domain/types";
import { emptyProgress } from "@/domain/types";
import type { ProgressRepository } from "@/domain/ports";
import type { KeyValueStore } from "./kvStore";

const KEY = (userId: string) => `ctfl:progress:${userId}`;

export class LocalProgressRepository implements ProgressRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(userId: string): Promise<Progress> {
    const raw = this.store.get(KEY(userId));
    if (!raw) return emptyProgress();
    try {
      return { ...emptyProgress(), ...(JSON.parse(raw) as Progress) };
    } catch {
      return emptyProgress();
    }
  }

  async save(userId: string, progress: Progress): Promise<void> {
    this.store.set(KEY(userId), JSON.stringify(progress));
  }
}
