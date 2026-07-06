export interface AuthViewProps {
  supportsSocial: boolean;
  cloud: boolean;
}

/** Modal de conta: entrar, criar conta e recuperar senha. */
export function renderAuth(p: AuthViewProps): string {
  const social = p.supportsSocial
    ? `<div class="social">
        <button class="social-btn" data-provider="google">Continuar com Google</button>
        <button class="social-btn" data-provider="github">Continuar com GitHub</button>
      </div><div class="or"><span>ou</span></div>`
    : `<p class="cloud-note">Contas ficam neste dispositivo. Para login com Google/GitHub e sincronização na nuvem, configure o Supabase (veja docs/SETUP.md).</p>`;

  return `
  <div class="auth">
    <h2 class="modal-title">Sua conta</h2>
    <div class="auth-tabs" role="tablist">
      <button class="auth-tab on" data-tab="signin">Entrar</button>
      <button class="auth-tab" data-tab="signup">Criar conta</button>
      <button class="auth-tab" data-tab="recover">Recuperar</button>
    </div>

    ${social}

    <form class="auth-panel" data-panel="signin">
      <label>E-mail<input type="email" id="si-email" autocomplete="email" required></label>
      <label>Senha<input type="password" id="si-pass" autocomplete="current-password" required></label>
      <button type="submit" class="btn primary" id="si-submit">Entrar</button>
    </form>

    <form class="auth-panel" data-panel="signup" hidden>
      <label>Nome<input type="text" id="su-name" autocomplete="name" required></label>
      <label>E-mail<input type="email" id="su-email" autocomplete="email" required></label>
      <label>Senha (mín. 6)<input type="password" id="su-pass" autocomplete="new-password" required></label>
      <button type="submit" class="btn primary" id="su-submit">Criar conta</button>
    </form>

    <form class="auth-panel" data-panel="recover" hidden>
      <label>E-mail<input type="email" id="rc-email" autocomplete="email" required></label>
      <div class="local-only">
        <label>Código de recuperação<input type="text" id="rc-code" placeholder="XXXX-XXXX-XXXX"></label>
        <label>Nova senha<input type="password" id="rc-pass" autocomplete="new-password"></label>
      </div>
      <button type="submit" class="btn primary" id="rc-submit">Recuperar senha</button>
    </form>

    <p class="auth-msg" id="auth-msg" aria-live="polite"></p>
    <div class="recovery-out" id="recovery-out" hidden></div>
  </div>`;
}
