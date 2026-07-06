import type { SocialProvider, User } from "@/domain/types";
import type { AuthProvider, Credentials, SignUpInput } from "@/domain/ports";

export const GUEST_USER: User = { id: "guest", name: "Visitante", email: null, provider: "local" };

/** Fachada dos casos de uso de autenticação sobre um AuthProvider (local ou nuvem). */
export class AuthService {
  constructor(private readonly provider: AuthProvider) {}

  get supportsSocial(): boolean {
    return this.provider.supportsSocial;
  }
  signUp(input: SignUpInput) {
    return this.provider.signUp(input);
  }
  signIn(creds: Credentials) {
    return this.provider.signIn(creds);
  }
  signOut() {
    return this.provider.signOut();
  }
  currentUser() {
    return this.provider.currentUser();
  }
  recover(email: string, code?: string, newPassword?: string) {
    return this.provider.recover(email, code, newPassword);
  }
  async signInWithProvider(provider: SocialProvider): Promise<void> {
    if (!this.provider.signInWithProvider) {
      throw new Error("Login social não está configurado. Veja docs/SETUP.md.");
    }
    return this.provider.signInWithProvider(provider);
  }
}
