# Funcionalidades → onde vivem no código

Mapa rápido de cada recurso até os arquivos que o implementam. As regras ficam no
domínio; os casos de uso orquestram; a apresentação exibe.

## 1. Modo exame oficial
Prova de 40 questões na distribuição **8/6/4/11/9/2**, 60 minutos, sem feedback até o
fim, corte em 65%.
- Regra: `domain/policies/exam.ts` (`selectExamQuestions`, `EXAM_DURATION_SEC`, `isPass`).
- Caso de uso: `application/startExam.ts`.
- UI: `presentation/views/suiteView.ts` (runner com cronômetro regressivo, navegação e grade de cobertura clicável) + o timer em `presentation/app.ts`.

## 2. Progresso, tempo e sequência (streak)
Salvos por usuário no dispositivo.
- Regra: `domain/policies/streak.ts` (com carência para o dia atual).
- Casos de uso: `application/trackStudyTime.ts` (cronômetro) e `application/computeProgress.ts` (painel).
- Persistência: `infrastructure/storage/localProgressRepository.ts`.
- Sincronização na nuvem (opcional): `infrastructure/storage/supabaseProgressRepository.ts` + `syncedProgressRepository.ts` (offline-first), plugada no composition root quando há Supabase.
- UI: `presentation/views/progressView.ts` (estatísticas, domínio por capítulo, atividade de 14 dias, histórico).

## 3. Reforço por pontos fracos
Monta uma rodada priorizando o que você mais erra e o que ainda não viu.
- Regra: `domain/services/reinforcement.ts` (pesos: nunca vista = alta; erros somam; acertos reduzem, com piso).
- Caso de uso: `application/buildReinforcementSuite.ts`.
- UI: botão "Treinar pontos fracos" no painel de progresso.

## 4. Exercícios interativos do Capítulo 4
Aplicação (nível K3) das técnicas de caixa-preta, com valores gerados a cada tentativa.
- Regra: `domain/services/cap4-exercises.ts` (particionamento de equivalência, valor limite, tabela de decisão — cada exercício sabe se validar).
- UI: `presentation/views/exercisesView.ts` dentro de um modal, acionado por "Exercícios Cap. 4".

## Autenticação (cadastro, login, recuperação, social)
- Portas: `domain/ports.ts` (`AuthProvider`).
- Local: `infrastructure/auth/localAuthProvider.ts` (SHA-256 + código de recuperação).
- Nuvem/social: `infrastructure/auth/supabaseAuthProvider.ts` (e-mail/senha, Google/GitHub, reset por e-mail).
- Fachada: `application/auth/authService.ts`.
- UI: `presentation/views/authView.ts` (abas entrar / criar / recuperar + botões sociais).

## Estudo dirigido (base)
- Caso de uso: `application/startStudySuite.ts`.
- Conteúdo: `infrastructure/data/syllabus.ts` e `infrastructure/data/questions.ts`.
- UI: `presentation/views/studyView.ts` (mapa de prioridade por peso no exame).
