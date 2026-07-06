import type { Chapter, ChapterId } from "./types";

export const CHAPTER_IDS: ChapterId[] = [1, 2, 3, 4, 5, 6];

/** Metadados dos 6 capítulos do syllabus CTFL v4.0. examWeight = questões no exame (total 40). */
export const CHAPTERS: Record<ChapterId, Chapter> = {
  1: { id: 1, name: "Fundamentos de Teste", color: "#2C3BE0", examWeight: 8 },
  2: { id: 2, name: "Testes ao Longo do Ciclo de Vida", color: "#0F8468", examWeight: 6 },
  3: { id: 3, name: "Teste Estático", color: "#C67C12", examWeight: 4 },
  4: { id: 4, name: "Análise e Modelagem de Teste", color: "#8B37C9", examWeight: 11 },
  5: { id: 5, name: "Gerenciamento das Atividades de Teste", color: "#C43D6B", examWeight: 9 },
  6: { id: 6, name: "Ferramentas de Teste", color: "#1B7FA8", examWeight: 2 },
};
