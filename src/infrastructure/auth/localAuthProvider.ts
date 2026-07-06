import type { User } from "@/domain/types";
import type { AuthProvider, AuthResult, Credentials, RecoverResult, SignUpInput } from "@/domain/ports";
import type { KeyValueStore } from "../storage/kvStore";
import { sha256 } from "../crypto/sha256";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  recoveryHash: string;
  provider: "local";
}

const USERS_KEY = "ctfl:auth:users";
const SESSION_KEY = "ctfl:auth:session";

function randomToken(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function formatRecovery(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/**
 * Autenticação LOCAL: cadastro, login, logout e recuperação por código.
 * Como não há servidor de e-mail, a "recuperação de senha" usa um código gerado
 * no cadastro (o usuário deve guardá-lo). Senhas são salgadas + SHA-256.
 */
export class LocalAuthProvider implements AuthProvider {
  readonly supportsSocial = false;
  constructor(private readonly store: KeyValueStore) {}

  private readUsers(): Record<string, StoredUser> {
    const raw = this.store.get(USERS_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, StoredUser>;
    } catch {
      return {};
    }
  }
  private writeUsers(users: Record<string, StoredUser>): void {
    this.store.set(USERS_KEY, JSON.stringify(users));
  }
  private toUser(u: StoredUser): User {
    return { id: u.id, name: u.name, email: u.email, provider: "local" };
  }
  private key(email: string): string {
    return email.trim().toLowerCase();
  }

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const email = this.key(input.email);
    if (!email || !input.password || !input.name.trim()) {
      throw new Error("Preencha nome, e-mail e senha.");
    }
    if (input.password.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
    const users = this.readUsers();
    if (users[email]) throw new Error("Já existe uma conta com este e-mail.");

    const salt = randomToken(8);
    const recovery = formatRecovery(randomToken(12));
    const user: StoredUser = {
      id: `local:${email}`,
      name: input.name.trim(),
      email,
      salt,
      hash: sha256(salt + input.password),
      recoveryHash: sha256(recovery),
      provider: "local",
    };
    users[email] = user;
    this.writeUsers(users);
    this.store.set(SESSION_KEY, user.id);
    return { user: this.toUser(user), recoveryCode: recovery };
  }

  async signIn(creds: Credentials): Promise<AuthResult> {
    const email = this.key(creds.email);
    const users = this.readUsers();
    const u = users[email];
    if (!u || u.hash !== sha256(u.salt + creds.password)) {
      throw new Error("E-mail ou senha inválidos.");
    }
    this.store.set(SESSION_KEY, u.id);
    return { user: this.toUser(u) };
  }

  async signOut(): Promise<void> {
    this.store.remove(SESSION_KEY);
  }

  async currentUser(): Promise<User | null> {
    const id = this.store.get(SESSION_KEY);
    if (!id) return null;
    const users = this.readUsers();
    const found = Object.values(users).find((u) => u.id === id);
    return found ? this.toUser(found) : null;
  }

  async recover(email: string, recoveryCode?: string, newPassword?: string): Promise<RecoverResult> {
    const key = this.key(email);
    const users = this.readUsers();
    const u = users[key];
    if (!u) return { ok: false, message: "Nenhuma conta encontrada com este e-mail." };
    if (!recoveryCode || !newPassword) {
      return { ok: false, message: "Informe o código de recuperação e a nova senha." };
    }
    if (u.recoveryHash !== sha256(recoveryCode.trim().toUpperCase())) {
      return { ok: false, message: "Código de recuperação inválido." };
    }
    if (newPassword.length < 6) return { ok: false, message: "A nova senha deve ter ao menos 6 caracteres." };
    u.hash = sha256(u.salt + newPassword);
    users[key] = u;
    this.writeUsers(users);
    return { ok: true, message: "Senha redefinida com sucesso. Você já pode entrar." };
  }
}
