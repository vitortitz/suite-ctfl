# Arquitetura

O projeto segue **Clean Architecture**. A regra central é a **regra de dependência**:
o código só depende para dentro. O domínio não conhece ninguém; a infraestrutura e a
apresentação dependem do domínio, nunca o contrário.

```
┌─────────────────────────────────────────────────────────┐
│  presentation  (DOM, views, controlador, estilos)        │
│      │  usa casos de uso e portas                        │
│  ┌───▼─────────────────────────────────────────────┐    │
│  │  application  (casos de uso / orquestração)      │    │
│  │      │  depende de domínio + portas              │    │
│  │  ┌───▼───────────────────────────────────────┐  │    │
│  │  │  domain  (entidades, políticas, serviços) │  │    │
│  │  │  — puro, sem dependências externas         │  │    │
│  │  └───────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────┘   │
│  infrastructure  (implementa as portas: storage, auth,   │
│  dados, cripto) — plugada de fora para dentro            │
└─────────────────────────────────────────────────────────┘
        composição em  src/main.ts  (composition root)
```

## Camadas

### `src/domain` — regras de negócio (puro)
Sem `import` de framework, DOM ou infraestrutura. Aqui vivem as verdades do CTFL.
- `types.ts` — entidades e tipos (Question, Attempt, Progress, Suite, User…).
- `chapters.ts` — os 6 capítulos e seus pesos no exame.
- `ports.ts` — **interfaces** que a aplicação consome (QuestionSource, ProgressRepository, AuthProvider, Rng, Clock).
- `policies/` — regras invariantes: `exam` (distribuição 8/6/4/11/9/2, 60 min, 65%), `scoring`, `streak`.
- `services/` — lógica composta: `suite` (embaralhar alternativas), `reinforcement` (pesos por ponto fraco), `cap4-exercises` (geradores + validadores).
- `random.ts` — utilidades determinísticas (shuffle, amostragem ponderada, RNG semeado para testes).

### `src/application` — casos de uso
Cada arquivo é uma classe fina que recebe as dependências pelo construtor (injeção) e
orquestra o domínio. Não sabe se os dados vêm de `localStorage` ou de um servidor.
`startStudySuite`, `startExam`, `buildReinforcementSuite`, `gradeSuite`,
`trackStudyTime`, `computeProgress`, `auth/authService`.

### `src/infrastructure` — adaptadores
Implementações concretas das portas: `data` (banco de questões estático, syllabus),
`storage` (localStorage com fallback em memória, repositório de progresso),
`auth` (provedor local com hash SHA-256; provedor Supabase para nuvem/social),
`crypto` (SHA-256 puro).

### `src/presentation` — interface
Vanilla TS + DOM. `app.ts` é o controlador; `views/` são funções puras (dados → HTML);
`components/` reúne peças reutilizáveis (grade de cobertura, modal). Não contém regra
de negócio — só apresentação e captura de eventos.

## Portas e adaptadores

O ganho prático: trocar uma implementação não toca no resto.
Exemplos já presentes:

| Porta (domínio)      | Adaptador local           | Adaptador nuvem            |
| -------------------- | ------------------------- | -------------------------- |
| `AuthProvider`       | `LocalAuthProvider`       | `SupabaseAuthProvider`     |
| `ProgressRepository` | `LocalProgressRepository` | `SupabaseProgressRepository` (+ `SyncedProgressRepository` offline-first) |
| `QuestionSource`     | `StaticQuestionSource`    | *(ex.: API/CMS)*           |

A escolha acontece só no **composition root** (`src/main.ts`), a partir de `config.ts`.

## Como escalar

- **Novas questões**: edite `src/infrastructure/data/questions.ts` — nada mais muda.
- **Nova técnica de exercício**: acrescente um gerador em `cap4-exercises.ts` e registre em `EXERCISE_KINDS`.
- **Persistir na nuvem**: já disponível — `SupabaseProgressRepository` e o `SyncedProgressRepository` (offline-first) são plugados no composition root quando o Supabase está configurado (ver docs/SETUP.md).
- **Outra fonte de questões**: implemente `QuestionSource` (banco, API) sem tocar domínio ou UI.
- **Testes**: como o domínio é puro e injeta `Rng`/`Clock`, tudo é determinístico e rápido.
