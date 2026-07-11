import { describe, it, expect } from "vitest";
import { GLOSSARY } from "@/infrastructure/data/glossary";
import { CHAPTER_IDS } from "@/domain/chapters";

describe("Glossário", () => {
  it("tem uma quantidade razoável de termos", () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(60);
  });

  it("todo termo tem texto, definição e capítulo válido", () => {
    for (const t of GLOSSARY) {
      expect(t.term.trim().length).toBeGreaterThan(0);
      expect(t.def.trim().length).toBeGreaterThan(10);
      expect(CHAPTER_IDS).toContain(t.chapter);
    }
  });

  it("não há termos duplicados", () => {
    const seen = new Set(GLOSSARY.map((t) => t.term.toLowerCase()));
    expect(seen.size).toBe(GLOSSARY.length);
  });

  it("cobre todos os seis capítulos", () => {
    const chapters = new Set(GLOSSARY.map((t) => t.chapter));
    for (const id of CHAPTER_IDS) expect(chapters.has(id)).toBe(true);
  });
});
