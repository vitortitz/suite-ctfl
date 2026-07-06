import { describe, it, expect, beforeEach } from "vitest";
import { LocalAuthProvider } from "@/infrastructure/auth/localAuthProvider";
import { MemoryStore } from "@/infrastructure/storage/kvStore";

describe("LocalAuthProvider", () => {
  let auth: LocalAuthProvider;
  beforeEach(() => {
    auth = new LocalAuthProvider(new MemoryStore());
  });

  it("cadastra, cria sessão e devolve um código de recuperação", async () => {
    const res = await auth.signUp({ name: "Ana", email: "Ana@Mail.com", password: "segredo1" });
    expect(res.user.email).toBe("ana@mail.com");
    expect(res.recoveryCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect((await auth.currentUser())?.email).toBe("ana@mail.com");
  });

  it("impede e-mail duplicado e senha curta", async () => {
    await auth.signUp({ name: "Ana", email: "ana@mail.com", password: "segredo1" });
    await expect(auth.signUp({ name: "X", email: "ana@mail.com", password: "segredo1" })).rejects.toThrow();
    await expect(auth.signUp({ name: "Y", email: "y@mail.com", password: "123" })).rejects.toThrow();
  });

  it("faz login com credenciais válidas e rejeita inválidas", async () => {
    await auth.signUp({ name: "Ana", email: "ana@mail.com", password: "segredo1" });
    await auth.signOut();
    expect(await auth.currentUser()).toBeNull();
    const res = await auth.signIn({ email: "ana@mail.com", password: "segredo1" });
    expect(res.user.name).toBe("Ana");
    await auth.signOut();
    await expect(auth.signIn({ email: "ana@mail.com", password: "errada" })).rejects.toThrow();
  });

  it("recupera a senha com o código correto e recusa o incorreto", async () => {
    const { recoveryCode } = await auth.signUp({ name: "Ana", email: "ana@mail.com", password: "segredo1" });
    const bad = await auth.recover("ana@mail.com", "AAAA-BBBB-CCCC", "novaSenha1");
    expect(bad.ok).toBe(false);
    const ok = await auth.recover("ana@mail.com", recoveryCode!, "novaSenha1");
    expect(ok.ok).toBe(true);
    await auth.signOut();
    const res = await auth.signIn({ email: "ana@mail.com", password: "novaSenha1" });
    expect(res.user.email).toBe("ana@mail.com");
  });
});
