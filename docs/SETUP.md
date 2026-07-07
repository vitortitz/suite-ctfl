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

## Leitura em voz alta (Google Cloud Text-to-Speech)

A aba Estudo tem um botão para ouvir o resumo do capítulo em voz alta. Isso usa o
**Google Cloud Text-to-Speech** (vozes Neural2/WaveNet/Standard) por trás de uma
**Supabase Edge Function** (`supabase/functions/tts`) — a API key do Google fica só
no servidor, nunca no navegador. A function faz **cache** do áudio gerado (um mesmo
capítulo/voz nunca é sintetizado duas vezes) e aplica uma **cota diária de
caracteres** como trava de segurança — o objetivo é manter o uso dentro do limite
gratuito do Google (1 milhão de caracteres/mês para vozes Neural2/WaveNet). Detalhes
no final desta seção.

> Outras implementações (Web Speech API do navegador e Gemini TTS) foram mantidas no
> repositório como referência/fallback futuro, mas não são usadas pela UI: veja
> `src/presentation/tts.ts` e `src/presentation/geminiTtsArchived.ts`.

### 1. Criar um projeto no Google Cloud (pule se já tiver um)
1. Acesse <https://console.cloud.google.com/> e faça login com sua conta Google.
2. No topo da página, clique no seletor de projeto → **Novo projeto**.
3. Dê um nome (ex.: `suite-ctfl-tts`) e clique em **Criar**. Espere alguns segundos
   até o projeto ser criado e selecione-o no seletor do topo.

### 2. Habilitar a Text-to-Speech API
1. Com o projeto selecionado, acesse
   <https://console.cloud.google.com/apis/library/texttospeech.googleapis.com>.
2. Clique em **Ativar** (Enable). Se for pedido para configurar cobrança
   (billing), você precisa vincular um cartão — a API tem cota gratuita mensal
   (4 milhões de caracteres/mês para vozes Standard; 1 milhão para
   WaveNet/Neural2), mas o Google exige billing habilitado mesmo para usar a
   cota grátis.

### 3. Gerar a API key
1. Acesse **APIs e Serviços → Credenciais**:
   <https://console.cloud.google.com/apis/credentials>.
2. Clique em **+ Criar credenciais → Chave de API**.
3. Uma key é gerada na hora — copie-a (você vai usar no passo 6, nunca no código).

### 4. Restringir a key (importante)
Ainda na tela de credenciais, clique na key recém-criada para editá-la:
1. Em **Restrições de API**, marque **Restringir chave** e selecione só a
   **Cloud Text-to-Speech API**. Isso impede que a key, se vazar, seja usada
   para acessar qualquer outro serviço do seu projeto.
2. Em **Restrições de aplicativo**, como essa key só vai ser usada pelo servidor
   (Edge Function, nunca pelo navegador), pode deixar em **Nenhuma** — restrição
   por referenciador HTTP não faz sentido aqui, pois não é chamada do browser.
3. Clique em **Salvar**.

### 5. Configurar um alerta de orçamento
Em <https://console.cloud.google.com/billing/budgets>, crie um orçamento (ex.:
R$ 20) com alerta por e-mail em 50%/90%/100%. Isso evita surpresa caso a cota
gratuita seja excedida por qualquer motivo.

### 6. Instalar e autenticar o Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 7. Vincular ao projeto Supabase já usado pelo app
O `project_id` já está em `supabase/config.toml` (o mesmo projeto de
`src/config.ts`). Rode dentro da raiz do repositório:
```bash
supabase link --project-ref rtsescugtwwgxgkddasi
```

### 8. Guardar a key do Google como secret (nunca no código)
```bash
supabase secrets set GOOGLE_TTS_API_KEY=SUA_KEY_AQUI
```

### 9. Criar a tabela de cota e o bucket de cache
No **SQL Editor** do Supabase, rode:
```sql
-- Cota diária de caracteres enviados ao Google (não conta acertos de cache).
create table if not exists public.tts_usage (
  day date primary key,
  chars_used integer not null default 0
);

-- Incremento atômico: evita duas requisições simultâneas lendo o mesmo valor
-- "antigo" e perdendo uma atualização.
create or replace function public.increment_tts_usage(p_day date, p_chars integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_total integer;
begin
  insert into public.tts_usage (day, chars_used)
  values (p_day, p_chars)
  on conflict (day) do update set chars_used = tts_usage.chars_used + excluded.chars_used
  returning chars_used into new_total;
  return new_total;
end;
$$;
```
E crie o bucket de cache de áudio (**Storage → New bucket**, nome `tts-cache`,
**privado** — a function usa a service role para ler/escrever nele, o navegador nunca
acessa diretamente):
```sql
insert into storage.buckets (id, name, public)
values ('tts-cache', 'tts-cache', false)
on conflict (id) do nothing;
```

### 10. Publicar a function
```bash
supabase functions deploy tts --no-verify-jwt
```

O `--no-verify-jwt` é **obrigatório**: sem ele, o gateway do Supabase exige um JWT em
toda requisição, inclusive no preflight `OPTIONS` que o navegador manda antes do
`POST` — e o preflight nunca carrega `Authorization`. O resultado é exatamente o erro
"Response to preflight request doesn't pass access control check" no console do
navegador. (`supabase/config.toml` já define `verify_jwt = false` para essa function;
a flag no deploy garante que isso é respeitado mesmo se o CLI ignorar o arquivo.)

Como a function fica acessível a quem souber a URL, a proteção real aqui é a key do
Google nunca sair do servidor (passo 4) mais o alerta de orçamento (passo 5) — não
vale a pena tentar "esconder" a URL atrás de uma checagem de header, já que a anon
key do Supabase é pública por natureza (embutida no bundle do app) e não daria
segurança de verdade.

Pronto — o botão "Ouvir resumo do capítulo" na aba Estudo passa a funcionar. Se a
function não estiver implantada (ou a key não estiver configurada), o app mostra uma
mensagem de erro em vez de travar.

### Cache e cota diária (economia de caracteres)
- **Cache**: antes de chamar o Google, a function calcula um hash (SHA-256 da voz +
  texto) e verifica se aquele áudio já existe no bucket `tts-cache`. Como os capítulos
  do syllabus são um conjunto fixo, depois da primeira leitura de cada capítulo/voz o
  custo cai para **zero** — todo mundo que pedir aquele mesmo capítulo depois só lê do
  cache, sem gastar nenhum caractere da cota do Google.
- **Cota diária**: só conta o que de fato é enviado ao Google (nunca os acertos de
  cache), contra um limite de **50.000 caracteres/dia** (`DAILY_CHAR_LIMIT` em
  `supabase/functions/tts/index.ts`) — bem abaixo do 1 milhão/mês gratuito de vozes
  Neural2/WaveNet, como margem de segurança. Se ultrapassar, a function responde 429
  com a mensagem "Limite diário de áudio atingido. Você ainda pode ler o resumo em
  texto abaixo!", que aparece automaticamente no status da leitura.
