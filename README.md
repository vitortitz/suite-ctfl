# Suíte CTFL

Plataforma de estudo para a certificação **ISTQB CTFL — Foundation Level (v4.0)**.
A metáfora do produto é uma *suíte de testes que você roda em si mesmo*: cada questão
é um caso de teste que passa ou falha, e o seu progresso é o relatório de cobertura.

Escrita em **TypeScript** com **Clean Architecture** (domínio isolado de framework e
infraestrutura), empacotada com **Vite** e testada com **Vitest**.

## O que ela faz

- **Simulado (estudo dirigido)** — escolha capítulos e quantidade; correção e explicação a cada questão.
- **Modo exame** — 40 questões na distribuição oficial (8/6/4/11/9/2), 60 minutos, sem feedback até o fim, aprovação a partir de 65%.
- **Área de estudo** — resumo do syllabus ordenado pelo peso de cada capítulo no exame.
- **Progresso e sequência** — streak de dias, tempo de estudo, domínio por capítulo e histórico, salvos no dispositivo.
- **Reforço por pontos fracos** — monta uma rodada priorizando o que você mais erra e o que ainda não viu.
- **Exercícios do Capítulo 4** — pratique particionamento de equivalência, valor limite e tabela de decisão com valores gerados a cada tentativa.
- **Contas** — cadastro, login e recuperação de senha localmente; opcionalmente Google/GitHub e nuvem via Supabase.

## Começar

```bash
npm install
npm run dev      # abre o servidor de desenvolvimento (Vite)
```

Abra o endereço mostrado no terminal. Para gerar a versão de produção:

```bash
npm run build    # typecheck + bundle em dist/
npm run preview  # serve o dist/ para conferência
```

> A aplicação usa ES modules, então precisa ser servida (não abra o `index.html`
> direto do sistema de arquivos). Use `npm run dev` ou sirva a pasta `dist/`.

## Testes e qualidade

```bash
npm test         # roda a suíte de testes (Vitest)
npm run typecheck # checagem de tipos sem emitir
```

Cobrem as regras de negócio (distribuição do exame, pontuação, streak, reforço,
exercícios), o provedor de autenticação local, o fluxo de progresso e um smoke test
de interface em DOM.

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — camadas, regra de dependência e portas/adaptadores.
- [`docs/SETUP.md`](docs/SETUP.md) — configurar nuvem, login social e recuperação por e-mail (Supabase).
- [`docs/FEATURES.md`](docs/FEATURES.md) — como cada funcionalidade se traduz em código.

## Aviso

Ferramenta de estudo **não oficial**. "ISTQB" e "CTFL" pertencem aos seus detentores.
O conteúdo segue o programa v4.0, mas não substitui o material oficial.
