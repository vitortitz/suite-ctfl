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
supabaseUrl: "https://rtsescugtwwgxgkddasi.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c2VzY3VndHd3Z3hna2RkYXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTg5MjgsImV4cCI6MjA5ODg3NDkyOH0.yqDtSkHY3DQDDweu8GVCsnIdlzRif9pcvpl5C8qbWZQ",
};

export const CLOUD_ENABLED = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
