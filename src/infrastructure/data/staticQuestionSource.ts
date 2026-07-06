import type { Question } from "@/domain/types";
import type { QuestionSource } from "@/domain/ports";
import { QUESTIONS } from "./questions";

export class StaticQuestionSource implements QuestionSource {
  constructor(private readonly questions: Question[] = QUESTIONS) {}
  all(): Question[] {
    return this.questions;
  }
  byChapter(chapter: number): Question[] {
    return this.questions.filter((q) => q.chapter === chapter);
  }
}
