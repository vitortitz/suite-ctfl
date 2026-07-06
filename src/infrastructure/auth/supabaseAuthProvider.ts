import type { User, SocialProvider } from "@/domain/types";
import type { AuthProvider, AuthResult, Credentials, RecoverResult, SignUpInput } from "@/domain/ports";

/**
 * Subconjunto tipado do cliente @supabase/supabase-js que este adaptador usa.
 * O cliente concreto é injetado (criado no composition root via import dinâmico do
 * CDN), mantendo o build sem dependências pesadas.
 */
export interface SupabaseLike {
  auth: {
    signUp(args: { email: string; password: string; options?: { data?: Record<string, unknown> } }): Promise<{ data: { user: SupabaseUser | null }; error: SupabaseError | null }>;
    signInWithPassword(args: { email: string; password: string }): Promise<{ data: { user: SupabaseUser | null }; error: SupabaseError | null }>;
    signInWithOAuth(args: { provider: SocialProvider; options?: { redirectTo?: string } }): Promise<{ error: SupabaseError | null }>;
    signOut(): Promise<{ error: SupabaseError | null }>;
    getUser(): Promise<{ data: { user: SupabaseUser | null }; error: SupabaseError | null }>;
    resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: SupabaseError | null }>;
  };
}
interface SupabaseUser {
  id: string;
  email?: string | null;
  app_metadata?: { provider?: string };
  user_metadata?: { name?: string };
}
interface SupabaseError {
  message: string;
}

/** Autenticação em nuvem (Supabase): e-mail/senha, login social e reset por e-mail. */
export class SupabaseAuthProvider implements AuthProvider {
  readonly supportsSocial = true;
  constructor(
    private readonly client: SupabaseLike,
    private readonly redirectTo?: string,
  ) {}

  private toUser(u: SupabaseUser): User {
    const raw = u.app_metadata?.provider ?? "email";
    const provider: User["provider"] = raw === "google" || raw === "github" ? raw : "email";
    return { id: u.id, name: u.user_metadata?.name ?? u.email ?? "Usuário", email: u.email ?? null, provider };
  }

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Confirme seu e-mail para ativar a conta.");
    return { user: this.toUser(data.user) };
  }

  async signIn(creds: Credentials): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword(creds);
    if (error) throw new Error(error.message);
    return { user: this.toUser(data.user!) };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async currentUser(): Promise<User | null> {
    const { data } = await this.client.auth.getUser();
    return data.user ? this.toUser(data.user) : null;
  }

  async recover(email: string): Promise<RecoverResult> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: this.redirectTo });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Enviamos um link de redefinição para o seu e-mail." };
  }

  async signInWithProvider(provider: SocialProvider): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({ provider, options: { redirectTo: this.redirectTo } });
    if (error) throw new Error(error.message);
  }
}
