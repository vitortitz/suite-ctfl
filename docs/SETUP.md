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
