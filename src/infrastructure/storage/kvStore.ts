/** Armazenamento chave-valor síncrono. Abstrai localStorage para permitir testes. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}

/** Usa localStorage quando disponível; cai para memória se bloqueado (modo anônimo etc). */
export function createBrowserStore(): KeyValueStore {
  try {
    const testKey = "__ctfl_probe__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      remove: (k) => localStorage.removeItem(k),
    };
  } catch {
    return new MemoryStore();
  }
}
