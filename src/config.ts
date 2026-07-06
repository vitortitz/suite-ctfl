/**
 * Configuração de nuvem (opcional). Preencha para habilitar contas na nuvem,
 * login social (Google/GitHub) e recuperação de senha por e-mail via Supabase.
 * Deixe em branco para usar contas locais neste dispositivo. Ver docs/SETUP.md.
 */
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const CONFIG: AppConfig = {
  supabaseUrl: "",
  supabaseAnonKey: "",
};

export const CLOUD_ENABLED = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
