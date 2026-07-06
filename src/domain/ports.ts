/** Interfaces (ports) que a camada de aplicação consome e a infraestrutura implementa. */
import type { Progress, Question, User, SocialProvider } from "./types";

/** Fonte de aleatoriedade injetável (permite testes determinísticos). */
export type Rng = () => number;

export interface Clock {
  now(): Date;
}

export interface QuestionSource {
  all(): Question[];
  byChapter(chapter: number): Question[];
}

export interface ProgressRepository {
  load(userId: string): Promise<Progress>;
  save(userId: string, progress: Progress): Promise<void>;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpInput extends Credentials {
  name: string;
}

export interface AuthResult {
  user: User;
  /** Presente apenas no provedor local: código para recuperar a senha (não há e-mail). */
  recoveryCode?: string;
}

export interface RecoverResult {
  ok: boolean;
  message: string;
}

export interface AuthProvider {
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(creds: Credentials): Promise<AuthResult>;
  signOut(): Promise<void>;
  currentUser(): Promise<User | null>;
  /**
   * Local: valida `recoveryCode` e define `newPassword`.
   * Nuvem: dispara e-mail de redefinição (ignora os demais parâmetros).
   */
  recover(email: string, recoveryCode?: string, newPassword?: string): Promise<RecoverResult>;
  readonly supportsSocial: boolean;
  signInWithProvider?(provider: SocialProvider): Promise<void>;
}
