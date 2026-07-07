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

## Leitura em voz alta (áudio estático pré-gerado)

A aba Estudo tem um botão para ouvir o resumo do capítulo em voz alta. Como o
conteúdo do syllabus é **fixo** (6 capítulos, texto não muda), o áudio de cada
capítulo é **gerado uma única vez** (offline, por um admin — nunca pelo clique do
usuário) com o **Google Cloud Text-to-Speech** (voz `pt-BR-Chirp3-HD-Charon`, a mais
natural disponível) e publicado como arquivo estático num bucket público do Supabase
Storage. Em tempo de execução, o navegador só faz um **GET** nesse arquivo — como
buscar qualquer asset estático — e toca com `<audio>`. **Não existe nenhuma chamada
de API de IA no front-end nem por clique do usuário**: o custo de geração acontece
uma vez, adiantado, e depois é sempre zero.

> Outras implementações (Web Speech API do navegador e Gemini TTS) foram mantidas no
> repositório como referência/fallback futuro, mas não são usadas pela UI: veja
> `src/presentation/tts.ts` e `src/presentation/geminiTtsArchived.ts`.

A function `supabase/functions/tts` continua existindo, mas só como **ferramenta de
(re)geração**: rode-a manualmente (via `curl`, com um segredo de admin) apenas se o
texto de um capítulo mudar no futuro. Ela nunca é chamada pelo app em produção.

### 1. Criar um projeto no Google Cloud (pule se já tiver um)
1. Acesse <https://console.cloud.google.com/> e faça login com sua conta Google.
2. No topo da página, clique no seletor de projeto → **Novo projeto**.
3. Dê um nome (ex.: `suite-ctfl-tts`) e clique em **Criar**. Espere alguns segundos
   até o projeto ser criado e selecione-o no seletor do topo.

### 2. Habilitar a Text-to-Speech API
1. Com o projeto selecionado, acesse
   <https://console.cloud.google.com/apis/library/texttospeech.googleapis.com>.
2. Clique em **Ativar** (Enable). Se for pedido para configurar cobrança
   (billing), você precisa vincular um cartão — a API tem cota gratuita mensal (1
   milhão de caracteres/mês para vozes Chirp3-HD/Neural2/WaveNet), mas o Google
   exige billing habilitado mesmo para usar a cota grátis.

### 3. Gerar a API key
1. Acesse **APIs e Serviços → Credenciais**:
   <https://console.cloud.google.com/apis/credentials>.
2. Clique em **+ Criar credenciais → Chave de API**.
3. Uma key é gerada na hora — copie-a (você vai usar no passo 8, nunca no código).

### 4. Restringir a key (importante)
Ainda na tela de credenciais, clique na key recém-criada para editá-la:
1. Em **Restrições de API**, marque **Restringir chave** e selecione só a
   **Cloud Text-to-Speech API**. Isso impede que a key, se vazar, seja usada
   para acessar qualquer outro serviço do seu projeto.
2. Em **Restrições de aplicativo**, como essa key só é usada pelo servidor (na
   geração offline, nunca pelo navegador), pode deixar em **Nenhuma**.
3. Clique em **Salvar**.

### 5. Configurar um alerta de orçamento
Em <https://console.cloud.google.com/billing/budgets>, crie um orçamento (ex.:
R$ 20) com alerta por e-mail em 50%/90%/100%. Como a geração é um evento único (não
recorrente), o custo real fica bem abaixo disso — o alerta é só uma margem de
segurança.

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

### 8. Guardar os secrets (nunca no código)
```bash
supabase secrets set GOOGLE_TTS_API_KEY=SUA_KEY_AQUI
supabase secrets set TTS_ADMIN_SECRET=UM_VALOR_ALEATORIO_SEU
```
O `TTS_ADMIN_SECRET` é seu, escolha qualquer string aleatória longa (ex.:
`openssl rand -hex 24` ou `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`)
— é o que autoriza chamar a function de (re)geração; guarde-o, você vai usar toda
vez que regenerar um capítulo.

### 9. Criar a tabela de cota e o bucket público de áudio
No **SQL Editor** do Supabase, rode:
```sql
-- Trava de segurança residual (evita gasto grande por engano, ex.: script em loop).
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

-- Bucket PÚBLICO: é dele que o navegador busca o áudio pronto, direto, sem passar
-- pela function nem por nenhuma API key em tempo de execução.
insert into storage.buckets (id, name, public)
values ('tts-static', 'tts-static', true)
on conflict (id) do update set public = true;
```

### 10. Publicar a function de geração
```bash
supabase functions deploy tts --no-verify-jwt
```
O `--no-verify-jwt` é necessário para o preflight `OPTIONS` funcionar (o gateway do
Supabase, por padrão, exige um JWT em toda requisição — inclusive no preflight, que
nunca carrega `Authorization` — e rejeita antes do código rodar). A proteção real
agora é o header `x-admin-secret` (passo 8): sem ele, a function responde 401.

### 11. Gerar (ou regenerar) o áudio de um capítulo
```bash
curl -X POST https://rtsescugtwwgxgkddasi.supabase.co/functions/v1/tts \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: SEU_TTS_ADMIN_SECRET" \
  -d '{"id":"chapter-1","text":"...texto do capítulo...","voiceName":"pt-BR-Chirp3-HD-Charon"}'
```
- `id` vira o nome do arquivo publicado: `chapter-1.json`, `chapter-2.json` etc. — é
  esse mesmo id que o front-end busca (`chapter-${numeroDoCapítulo}`).
- `text` é o texto puro do capítulo — gere-o com `chapterToSpeechText()` (em
  `src/presentation/googleCloudTts.ts`), que já cuida de inserir pontuação entre
  itens de lista para o Google não rejeitar "frases longas demais".
- Rode uma vez por capítulo (id `chapter-1` a `chapter-6`). Só precisa rodar de novo
  se o texto daquele capítulo mudar no `syllabus.ts`.

Pronto — o botão "Ouvir resumo do capítulo" na aba Estudo passa a tocar o áudio
publicado. Se o arquivo daquele capítulo ainda não existir no bucket, o app mostra
uma mensagem de erro em vez de travar.
