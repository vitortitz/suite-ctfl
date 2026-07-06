# Configuração

## Requisitos
- Node.js 18+ e npm.

## Desenvolvimento
```bash
npm install
npm run dev
```

## Produção
```bash
npm run build     # typecheck + bundle em dist/
npm run preview   # confere o dist/ servido localmente
```
Hospede o conteúdo de `dist/` em qualquer servidor de arquivos estáticos
(Netlify, Vercel, GitHub Pages, Nginx…).

---

## Contas locais (padrão, sem configuração)
Sem nenhuma chave, o app usa **contas locais**:
- Cadastro, login e logout funcionam no próprio dispositivo.
- A senha é salgada e passada por **SHA-256** antes de ser guardada.
- Como não há servidor de e-mail, a **recuperação de senha** usa um **código**
  gerado no cadastro — guarde-o; é a única forma de redefinir a senha dessa conta.

> Segurança: contas locais servem para **separar perfis no mesmo navegador**, não são
> autenticação forte. Para segurança real e sincronização, use a nuvem (abaixo).

---

## Nuvem, login social e reset por e-mail (Supabase)

A camada de nuvem é **opcional** e já vem implementada (`SupabaseAuthProvider`).
Habilite assim:

1. Crie um projeto grátis em <https://supabase.com>.
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
3. Preencha `src/config.ts`:
   ```ts
   export const CONFIG: AppConfig = {
     supabaseUrl: "https://SEU-PROJETO.supabase.co",
     supabaseAnonKey: "SUA-ANON-KEY",
   };
   ```
4. Em **Authentication → Providers**, ative **Email**, **Google** e/ou **GitHub**
   (cada provedor social pede um Client ID/Secret criado no console do Google/GitHub).
5. Em **Authentication → URL Configuration**, adicione a URL onde o app está hospedado
   como *redirect URL*.

Com isso, o cliente Supabase é carregado sob demanda e o app passa a oferecer:
e-mail/senha na nuvem, botões de **Google/GitHub** e **reset de senha por e-mail**.

### Importante sobre login social
O OAuth (Google/GitHub) **redireciona o navegador** e exige uma **URL hospedada**
registrada no provedor — não funciona abrindo o arquivo localmente. Rode via
`npm run dev` (URL local registrada) ou publique o `dist/`.

### Sincronizar o progresso na nuvem
Já implementado. Quando o Supabase está configurado, o composition root usa um
`SyncedProgressRepository` **offline-first**: toda gravação vai para o cache local e é
espelhada na nuvem; a leitura prefere a nuvem e atualiza o cache; sem conexão, usa o
local. No primeiro login em um dispositivo com dados locais e nuvem vazia, o local é
enviado para a nuvem. O visitante (guest) nunca toca a nuvem.

Falta apenas criar a tabela. No **SQL Editor** do Supabase, rode:

```sql
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id);
```

O RLS garante que cada pessoa só lê e grava o próprio progresso. O `user_id` usado
pelo app é o id do usuário autenticado (`auth.uid()`), então nada mais precisa mudar.

---

## Leitura em voz alta (Gemini TTS)

A aba Estudo tem um botão para ouvir o resumo do capítulo em voz alta. Isso usa o
**Gemini TTS** (vozes neurais nativas do Gemini) por trás de uma **Supabase Edge
Function** (`supabase/functions/tts`) — a API key do Gemini fica só no servidor,
nunca no navegador.

> Implementações anteriores (Web Speech API do navegador e Google Cloud
> Text-to-Speech clássico) foram mantidas no repositório como referência/fallback
> futuro, mas não são usadas pela UI: veja `src/presentation/tts.ts` e
> `src/presentation/googleCloudTtsArchived.ts`.

### 1. Criar a API key do Gemini
1. Acesse <https://aistudio.google.com/app/apikey> (ou o Google Cloud Console,
   habilitando a **Generative Language API** no seu projeto).
2. Gere uma API key.
3. **Restrinja a key** no Google Cloud Console a apenas essa API, para reduzir o
   impacto caso ela vaze.
4. Configure um **alerta de orçamento** no Cloud Billing — o modelo `gemini-2.5-
   flash-preview-tts` tem cota gratuita, mas é bom ter um alarme de segurança.

### 2. Instalar e autenticar o Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 3. Vincular ao projeto Supabase já usado pelo app
O `project_id` já está em `supabase/config.toml` (o mesmo projeto de
`src/config.ts`). Rode dentro da raiz do repositório:
```bash
supabase link --project-ref rtsescugtwwgxgkddasi
```

### 4. Guardar a key do Gemini como secret (nunca no código)
```bash
supabase secrets set GEMINI_API_KEY=SUA_KEY_AQUI
```

### 5. Publicar a function
```bash
supabase functions deploy tts --no-verify-jwt
```

O `--no-verify-jwt` é **obrigatório**: sem ele, o gateway do Supabase exige um JWT em
toda requisição, inclusive no preflight `OPTIONS` que o navegador manda antes do
`POST` — e o preflight nunca carrega `Authorization`. O resultado é exatamente o erro
"Response to preflight request doesn't pass access control check" no console do
navegador. (`supabase/config.toml` já define `verify_jwt = false` para essa function;
a flag no deploy garante que isso é respeitado mesmo se o CLI ignorar o arquivo.)

Como a function fica acessível a quem souber a URL, ela ainda confere se o pedido
trouxe a **anon key pública** do Supabase no header `Authorization` (o app já manda
isso sozinho) — não é autenticação forte, só reduz abuso por quem não conhece o
projeto. A proteção de verdade continua sendo a key do Gemini nunca sair do servidor,
mais o alerta de orçamento do passo 1.

Pronto — o botão "Ouvir resumo do capítulo" na aba Estudo passa a funcionar. Se a
function não estiver implantada (ou a key não estiver configurada), o app mostra uma
mensagem de erro em vez de travar.

### Sobre a API do Gemini TTS (preview)
`gemini-2.5-flash-preview-tts` é uma API em preview — confira o formato exato da
requisição/resposta em <https://ai.google.dev/gemini-api/docs/speech-generation>
antes de depender disso em produção; nomes de campos podem mudar entre versões.
