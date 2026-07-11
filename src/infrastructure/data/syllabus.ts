import type { ChapterId } from "@/domain/types";

/** Nível de conhecimento (legenda oficial do syllabus ISTQB CTFL v4.0). */
export type KLevel = "K1" | "K2" | "K3";

export interface SyllabusSection {
  /** Número da seção no syllabus, ex.: "1.1". */
  id: string;
  label: string;
  /** Níveis de conhecimento dos objetivos de aprendizagem (LO) desta seção. */
  k: KLevel[];
  html: string;
}
export interface ChapterSyllabus {
  intro: string;
  sections: SyllabusSection[];
  /**
   * Conteúdo extra de aprofundamento (armadilhas de prova, exemplos, mnemônicos).
   * NÃO é incluído na narração em áudio (chapterToSpeechText só lê intro + sections),
   * então adicioná-lo aqui não dessincroniza o áudio estático já publicado.
   */
  deepen?: string;
}

/**
 * Resumo por seção do syllabus CTFL v4.0 (tradução BSTQB, 2023-04-21), com o nível
 * de conhecimento de cada seção conforme o Apêndice A e as matrizes do Apêndice B.
 * Textos escritos de forma própria e condensada — não reproduzem o syllabus oficial.
 * Legenda: K1 = Lembrar · K2 = Compreender · K3 = Aplicar.
 */
export const SYLLABUS: Record<ChapterId, ChapterSyllabus> = {
  1: {
    deepen: `<div class="callout"><span class="tt">pegadinhas de prova</span>"Provar que o software está livre de defeitos" nunca é um objetivo válido (1º princípio). QA ≠ teste: a QA é preventiva e focada no processo; o teste é controle de qualidade (QC), corretivo e focado no produto. Uma falha pode ocorrer sem defeito (condições ambientais), e nem todo defeito chega a virar falha.</div>
      <p><b>Mnemônico dos 7 princípios:</b> <b>D</b>efeitos (mostra presença, não ausência) · <b>E</b>xaustivo é impossível · <b>A</b>ntecipado economiza · <b>P</b>esticida (paradoxo) · agru<b>P</b>amento (clustering) · <b>C</b>ontexto · <b>A</b>usência de erros é uma falácia.</p>
      <p><b>Decore a cadeia causal:</b> uma pessoa comete um <b>erro</b> → que introduz um <b>defeito</b> → que, ao ser executado, pode provocar uma <b>falha</b>. Ordem fixa: erro → defeito → falha.</p>
      <p><b>Papéis:</b> planejar/monitorar o processo é da <b>gerência de teste</b>; analisar, projetar, implementar e executar é do <b>testador</b>; decidir a liberação é do <b>negócio</b>.</p>`,
    intro:
      "O alicerce: vocabulário, princípios e o processo de teste. No exame só há questões K1 e K2 aqui.",
    sections: [
      {
        id: "1.1",
        label: "O que é teste?",
        k: ["K1", "K2"],
        html: `<p>Teste é um conjunto de atividades — <b>estáticas e dinâmicas</b> — para descobrir defeitos, avaliar a qualidade e <b>reduzir o risco</b> de falhas. Vai além de executar o software: inclui planejar, analisar, modelar e revisar.</p>
        <p><b>Objetivos típicos (FL-1.1.1 K1):</b> avaliar produtos de trabalho (requisitos, histórias, design, código), encontrar defeitos e falhas, garantir cobertura, reduzir risco, verificar e validar requisitos, dar informação para decisões, criar confiança, validar se o objeto está completo.</p>
        <p><b>Verificação vs. Validação:</b> verificação = construir <i>corretamente</i> (conforme especificação); validação = construir o produto <i>certo</i> (atende necessidades dos usuários).</p>
        <p><b>Teste ≠ depuração (FL-1.1.2 K2):</b> o teste dinâmico revela falhas; a depuração reproduz (reproduzir a falha), diagnostica (encontrar a causa-raiz) e corrige o defeito. No teste estático o defeito é achado diretamente, sem produzir falha.</p>
        <p><b>Os objetivos variam conforme o contexto:</b> no teste de componente, o foco costuma ser encontrar o máximo de falhas possível; no teste de aceitação, confirmar que o sistema funciona conforme esperado e criar confiança para a entrega; no teste de manutenção, garantir que nenhuma funcionalidade existente foi quebrada por uma mudança.</p>
        <div class="callout"><span class="tt">exemplo</span>Uma revisão de requisitos (estática) encontra uma ambiguidade sem executar nada; testar o login com senha errada (dinâmico) provoca uma falha observável que revela o defeito.</div>
        <p><b>Base de teste:</b> o conjunto de documentos dos quais as condições de teste são derivadas — requisitos, histórias de usuário, arquitetura, código, ou até o conhecimento tácito de um especialista de domínio. Sem uma base de teste (mesmo informal), não há como saber o que testar nem definir o resultado esperado.</p>`,
      },
      {
        id: "1.2",
        label: "Por que os testes são necessários?",
        k: ["K1", "K2"],
        html: `<p>O teste reduz o risco de falhas em operação e sustenta a qualidade. <b>Contribuições (FL-1.2.1 K2):</b> detecção econômica de defeitos, avaliação direta da qualidade, representação indireta dos usuários, conformidade legal e contratual.</p>
        <p><b>Testes e QA (FL-1.2.2 K1):</b> o <b>teste é controle de qualidade (QC)</b> — abordagem corretiva e orientada ao produto; a <b>QA</b> é preventiva e focada no processo (garante que os processos produzam qualidade).</p>
        <dl class="term"><dt>Erro</dt><dd>Engano humano (equívoco de uma pessoa).</dd><dt>Defeito</dt><dd>Imperfeição no artefato causada pelo erro (bug/falta).</dd><dt>Falha</dt><dd>Comportamento incorreto ao executar o defeito.</dd><dt>Causa-raiz</dt><dd>Motivo fundamental do problema — identificada pela análise de causa-raiz.</dd></dl>
        <p><b>FL-1.2.3 K2:</b> Nem todo defeito vira falha; falhas também surgem de condições ambientais (ex.: radiação afetando firmware). Causas-raiz abordadas evitam defeitos futuros similares.</p>
        <p><b>Exemplos de conformidade legal/contratual:</b> normas setoriais como <b>DO-178C</b> (aviônicos), <b>IEC 61508</b> (segurança funcional) e <b>ISO 26262</b> (automotivo) exigem evidências de teste como parte da certificação — nesses contextos, testar não é opcional.</p>
        <p><b>Custo da qualidade:</b> soma dos custos de <b>prevenção</b> (treinamento, planejamento de testes), <b>avaliação</b> (revisões, execução de testes) e <b>falha</b> — interna (retrabalho antes da entrega) ou externa (suporte, ações judiciais, dano à reputação depois da entrega). Investir em prevenção e avaliação reduz drasticamente os custos de falha externa — é a base econômica do princípio "teste antecipado economiza tempo e dinheiro".</p>`,
      },
      {
        id: "1.3",
        label: "Princípios de teste",
        k: ["K2"],
        html: `<p><b>FL-1.3.1 K2 — Os sete princípios:</b></p>
        <dl class="term">
        <dt>1 — Teste mostra presença de defeitos</dt><dd>Pode provar que defeitos existem, nunca que não existem (Buxton 1970).</dd>
        <dt>2 — Teste exaustivo é impossível</dt><dd>Usar técnicas, priorização por risco e análise de limite (Manna 1978).</dd>
        <dt>3 — Teste antecipado economiza tempo e dinheiro</dt><dd>Defeitos removidos cedo não se propagam; custo da qualidade cai (Boehm 1981).</dd>
        <dt>4 — Agrupamento de defeitos</dt><dd>Poucos módulos concentram a maioria dos defeitos (princípio de Pareto) — base do teste baseado em risco.</dd>
        <dt>5 — Os testes se degradam (paradoxo do pesticida)</dt><dd>Repetir os mesmos testes deixa de achar novos defeitos; revisar e criar novos testes regularmente.</dd>
        <dt>6 — Teste depende do contexto</dt><dd>O que e como testar variam conforme criticidade, domínio, regulação e modelo de desenvolvimento.</dd>
        <dt>7 — Falácia da ausência de defeitos</dt><dd>Um sistema quase sem defeitos pode ser inútil se não atender às necessidades dos usuários — validar é essencial (Boehm 1981).</dd>
        </dl>
        <div class="callout"><span class="tt">mnemônico</span>Uma forma de lembrar: defeitos se escondem em grupos (4) e testar exaustivamente é impossível (2); por isso teste cedo (3), de formas diferentes a cada rodada (5) e sempre adaptado ao contexto (6) — sem nunca provar que o sistema está livre de defeitos (1, 7).</div>`,
      },
      {
        id: "1.4",
        label: "Atividades de teste, testware e papéis",
        k: ["K2"],
        html: `<p><b>Atividades do processo (FL-1.4.1 K2):</b></p>
        <dl class="term">
        <dt>Planejamento</dt><dd>Define objetivos e abordagem dentro das restrições do contexto.</dd>
        <dt>Monitoramento e Controle</dt><dd>Verificação contínua do progresso e ações corretivas.</dd>
        <dt>Análise</dt><dd>Examina a base de teste; responde "o que testar?" em critérios de cobertura mensuráveis.</dd>
        <dt>Modelagem</dt><dd>Elabora condições de teste em casos de teste; responde "como testar?".</dd>
        <dt>Implementação</dt><dd>Cria/adquire dados de teste, organiza em procedimentos e conjuntos.</dd>
        <dt>Execução</dt><dd>Roda os testes, compara resultados reais × esperados, registra anomalias.</dd>
        <dt>Conclusão</dt><dd>Consolida experiência, arquiva testware, cria relatório de conclusão em marcos do projeto.</dd>
        </dl>
        <p>Embora listadas em sequência, essas atividades podem se sobrepor ou repetir — em ágil, análise e modelagem de uma história costumam ocorrer quase em paralelo, dentro da mesma iteração.</p>
        <p><b>Contexto (FL-1.4.2 K2):</b> fatores que moldam o processo: stakeholders, equipe, domínio de negócio, aspectos técnicos, restrições do projeto, fatores organizacionais, SDLC escolhido e ferramentas disponíveis.</p>
        <p><b>Testware (FL-1.4.3 K2):</b> tudo que se produz — plano, registro de riscos, condições, casos, cartas de teste, dados, scripts, procedimentos, registros, relatórios. Gerenciado pela gerência de configuração.</p>
        <p><b>Produtos de trabalho por atividade (exemplos):</b> Planejamento → plano de teste; Monitoramento/Controle → relatórios de progresso; Análise → condições de teste e registro de risco atualizado; Modelagem → casos e conjuntos de teste; Implementação → procedimentos, scripts e cronograma de execução; Execução → registros de teste e relatórios de defeito; Conclusão → relatório de conclusão e lições aprendidas.</p>
        <p><b>Hierarquia de refinamento:</b> <i>condição de teste</i> (o que testar, ex.: "validar limite de idade") → <i>caso de teste</i> (entradas, ações e resultado esperado concretos) → <i>procedimento/script de teste</i> (a sequência de passos executáveis, manual ou automatizada). Cada nível é mais detalhado e mais próximo da execução do que o anterior.</p>
        <p><b>Rastreabilidade (FL-1.4.4 K2):</b> liga base de teste ↔ condições ↔ casos ↔ resultados ↔ defeitos. Permite avaliar cobertura, impacto de mudanças, auditorias e comunicação com stakeholders.</p>
        <p><b>Papéis (FL-1.4.5 K2) — dois papéis no nível fundamental:</b> <b>gerenciamento de teste</b> (planejar, monitorar/controlar, concluir) e <b>testador</b> (analisar, modelar, implementar, executar). Uma pessoa pode ocupar ambos.</p>`,
      },
      {
        id: "1.5",
        label: "Habilidades essenciais e boas práticas",
        k: ["K1", "K2"],
        html: `<p><b>Habilidades genéricas (FL-1.5.1 K2):</b> conhecimento de teste, meticulosidade/atenção a detalhes, boas habilidades de comunicação (ser ouvinte), pensamento analítico e crítico, criatividade, conhecimento técnico e do domínio. Comunicar defeitos de forma construtiva é crucial — viés de confirmação dificulta aceitar más notícias.</p>
        <p><b>Papel generalista:</b> em muitos contextos — especialmente ágil — a mesma pessoa acumula o papel de testador com outras funções (desenvolvedor, analista de negócio, DBA) sem perder a mentalidade crítica de teste.</p>
        <p><b>Abordagem de equipe completa / whole-team (FL-1.5.2 K1):</b> qualquer membro com habilidades pode executar qualquer tarefa; todos são responsáveis pela qualidade. Vem da Extreme Programming (XP). Melhora dinâmica, comunicação e colaboração — mas pode não ser adequada em contextos críticos de segurança.</p>
        <p><b>Independência do teste (FL-1.5.3 K2):</b></p>
        <dl class="term">
        <dt>Sem independência</dt><dd>O próprio autor testa (desenvolvedores testam seu código).</dd>
        <dt>Alguma independência</dt><dd>Colegas da mesma equipe.</dd>
        <dt>Alta independência</dt><dd>Testadores de fora da equipe, dentro da organização.</dd>
        <dt>Independência muito alta</dt><dd>Testadores de fora da organização.</dd>
        </dl>
        <p><b>Benefícios:</b> testadores independentes encontram tipos diferentes de defeitos; questionam premissas. <b>Desvantagens:</b> risco de isolamento, problemas de comunicação, relação adversa com o dev, perda do senso de responsabilidade dos devs, visto como gargalo.</p>
        <p><b>Comunicação construtiva na prática:</b> descreva o defeito, não a pessoa. Em vez de "você esqueceu de validar o campo", prefira "o campo aceita valores negativos, o que não está previsto na especificação" — objetivo, verificável e sem julgar quem escreveu o código.</p>`,
      },
    ],
  },
  2: {
    deepen: `<div class="callout"><span class="tt">pegadinhas de prova</span>Confirmação ≠ regressão: a <b>confirmação (reteste)</b> reexecuta o caso que falhou para ver se o defeito foi corrigido; a <b>regressão</b> checa se a mudança não quebrou o que já funcionava. TDD, ATDD e BDD são abordagens "test-first". Shift-left significa testar <i>cedo</i> — nunca adiar.</div>
      <p><b>Níveis (do menor ao maior):</b> componente → integração → sistema → aceite. Os <b>tipos</b> de teste (funcional, não funcional, caixa-branca, relacionado a mudança) cortam <i>todos</i> os níveis — não há restrição de nível.</p>
      <p><b>Gatilhos de manutenção:</b> Modificação (correção/melhoria) · Migração/atualização de ambiente · Aposentadoria (arquivamento e recuperação de dados). Não confunda com "testar a manutenibilidade" — isso é uma característica de qualidade, não um gatilho.</p>
      <p><b>test-first num relance:</b> TDD guia o <i>código</i>; ATDD deriva testes dos <i>critérios de aceite</i>; BDD descreve o <i>comportamento</i> em dado/quando/então.</p>`,
    intro:
      "Onde o teste se encaixa no SDLC: modelos, abordagens test-first, DevOps, shift-left, níveis e tipos de teste, e manutenção. Só K1 e K2.",
    sections: [
      {
        id: "2.1",
        label: "Testes no contexto do ciclo de vida (SDLC)",
        k: ["K1", "K2"],
        html: `<p><b>FL-2.1.1 K2 — Impacto do SDLC nos testes:</b> o modelo escolhido afeta escopo/cronograma, detalhe da documentação, técnicas e automação, papel e responsabilidades do testador. Modelos: <b>sequencial</b> (cascata, V), <b>iterativo</b> (espiral, prototipagem) e <b>incremental</b> (Processo Unificado, ágeis como Scrum, Kanban, XP).</p>
        <p><b>FL-2.1.2 K1 — Boas práticas independentes do SDLC:</b> para cada atividade de desenvolvimento há uma atividade de teste correspondente; cada nível tem objetivos distintos; análise e modelagem começam durante a fase de desenvolvimento correspondente; testadores envolvidos nas revisões desde os rascunhos iniciais.</p>
        <p><b>FL-2.1.3 K1 — Abordagens test-first:</b></p>
        <dl class="term">
        <dt>TDD</dt><dd>Testes escritos antes do código; código implementado para satisfazer os testes; depois refatoração.</dd>
        <dt>ATDD</dt><dd>Testes derivados dos critérios de aceite antes da implementação da história.</dd>
        <dt>BDD</dt><dd>Comportamento expresso em linguagem natural (Dado/Quando/Então); testes traduzidos automaticamente em executáveis.</dd>
        </dl>
        <p><b>FL-2.1.4 K2 — DevOps e testes:</b> abordagem organizacional que une desenvolvimento (incluindo testes) e operações. Promove autonomia, feedback rápido, CI/CD. <b>Benefícios:</b> feedback rápido sobre qualidade, shift-left via CI, automação de regressão, visibilidade de características não funcionais. <b>Riscos:</b> pipeline de entrega precisa ser definido e mantido; automação exige recursos adicionais.</p>
        <p><b>FL-2.1.5 K2 — Shift-left:</b> antecipar o teste no SDLC. Boas práticas: revisar especificações, escrever casos de teste antes do código, usar CI/CD, análise estática antes dos testes dinâmicos, testes não funcionais desde o nível de componente. Pode exigir custo inicial maior, mas economiza no final.</p>
        <p><b>FL-2.1.6 K2 — Retrospectivas:</b> realizadas no final de iteração, projeto ou marco. Participantes discutem o que foi bem, o que pode melhorar e como incorporar melhorias. Resultados no relatório de conclusão. Benefícios: maior eficácia/eficiência, qualidade do testware, vínculo da equipe, melhoria da base de teste.</p>
        <p><b>Modelo V (exemplo sequencial):</b> cada fase de desenvolvimento tem uma fase de teste correspondente planejada em paralelo — aceitação ↔ requisitos, sistema ↔ projeto arquitetural, integração ↔ projeto detalhado, componente ↔ codificação. A análise e o projeto de teste começam muito antes da execução, em espelho com o dev.</p>
        <p><b>Scrum e Kanban na prática:</b> no Scrum, o time testa dentro de sprints com Sprint Backlog, Daily Scrum, Sprint Review e Retrospectiva; no Kanban, o fluxo é contínuo, com limites de trabalho em progresso (WIP) e um quadro visual no lugar de iterações fixas.</p>
        <p><b>Shift-right:</b> complementa o shift-left testando também em produção — monitoramento, transações sintéticas, testes A/B e lançamentos canário (canary releases) validam o comportamento real com risco controlado.</p>
        <p><b>CI, Continuous Delivery e Continuous Deployment não são sinônimos:</b> <b>CI</b> integra e testa automaticamente a cada commit; <b>Continuous Delivery</b> garante que o build está sempre pronto para ir a produção, mas a liberação é manual; <b>Continuous Deployment</b> vai além e libera automaticamente cada build aprovado para produção, sem intervenção humana.</p>`,
      },
      {
        id: "2.2",
        label: "Níveis de teste e tipos de teste",
        k: ["K2"],
        html: `<p><b>FL-2.2.1 K2 — Cinco níveis de teste:</b></p>
        <dl class="term">
        <dt>Componente (Unitário)</dt><dd>Módulos isolados; usa frameworks e mocks/stubs; realizado pelos próprios desenvolvedores.</dd>
        <dt>Integração de componentes</dt><dd>Interfaces entre módulos; estratégias: bottom-up, top-down, big-bang.</dd>
        <dt>Sistema</dt><dd>Comportamento do sistema inteiro; funcional de ponta a ponta e não funcional; equipe independente.</dd>
        <dt>Integração de sistemas</dt><dd>Interfaces com outros sistemas e serviços externos; ambiente similar ao operacional.</dd>
        <dt>Aceite</dt><dd>Valida disposição para implantação; formas: UAT, operacional, contratual/normativo, alfa (no dev), beta (no cliente).</dd>
        </dl>
        <p>Diferenciados por: objeto de teste, objetivos, base de teste, tipos de defeitos/falhas e abordagem/responsabilidades.</p>
        <p><b>Estratégias de integração:</b> <b>big-bang</b> (tudo integrado de uma vez — simples de organizar, mas difícil de isolar defeitos), <b>bottom-up</b> (de baixo para cima, usando <i>drivers</i> para simular módulos superiores ainda não prontos) e <b>top-down</b> (de cima para baixo, usando <i>stubs</i> para simular módulos inferiores ainda não prontos).</p>
        <p><b>FL-2.2.2 K2 — Tipos de teste:</b> <b>funcional</b> (o que faz — integridade, correção, adequação), <b>não funcional</b> (quão bem faz — ISO 25010), <b>caixa-preta</b> (comportamento/especificação) e <b>caixa-branca</b> (estrutura/código). Todos os tipos aplicam-se a todos os níveis.</p>
        <p><b>As 8 características da ISO/IEC 25010:</b> adequação funcional, eficiência de desempenho, compatibilidade, usabilidade, confiabilidade, segurança, manutenibilidade e portabilidade — base para os tipos de teste não funcional.</p>
        <p><b>FL-2.2.3 K2 — Confirmação ≠ Regressão:</b> <b>confirmação</b> re-executa o caso que falhou para verificar se o defeito foi corrigido; <b>regressão</b> garante que mudanças não quebraram o que funcionava — forte candidata à automação; deve começar cedo e crescer a cada iteração.</p>
        <p><b>Base de teste típica por nível:</b> componente → especificação de componente, modelo de dados, código; integração de componentes → arquitetura de software, sequência de chamadas, protocolos de interface; sistema → especificação de requisitos, casos de uso, modelos de risco; integração de sistemas → arquitetura do sistema, especificações de interface externa; aceite → requisitos de negócio, processos, regulações, necessidades do usuário.</p>`,
      },
      {
        id: "2.3",
        label: "Teste de manutenção",
        k: ["K2"],
        html: `<p><b>FL-2.3.1 K2 — Acionadores (triggers):</b></p>
        <dl class="term">
        <dt>Modificações</dt><dd>Aprimoramentos planejados (versões), correções corretivas, hot fixes.</dd>
        <dt>Migração / Atualização de ambiente</dt><dd>Nova plataforma, novo SO — testa o novo ambiente e o software; conversão de dados quando migrado de outro sistema.</dd>
        <dt>Aposentadoria</dt><dd>Fim de vida do sistema — testa arquivamento de dados, restauração e recuperação.</dd>
        </dl>
        <p><b>Escopo</b> depende do grau de risco da mudança, tamanho do sistema e tamanho da mudança. A <b>análise de impacto</b> identifica áreas afetadas e decide se a mudança deve ser feita — fundamental para dimensionar a regressão.</p>
        <p><b>Na prática:</b> quanto maior o risco e o tamanho da mudança, maior o escopo de regressão necessário; a qualidade da rastreabilidade existente entre requisitos e testware determina o quão precisa (e barata) essa análise pode ser.</p>
        <div class="callout"><span class="tt">exemplo</span>Uma loja online altera a fórmula de cálculo do frete. Análise de impacto identifica: carrinho de compras, checkout, cupons de desconto (podem combinar com frete grátis) e o relatório financeiro — todas essas áreas entram no escopo da regressão, mesmo sem terem sido alteradas diretamente.</div>`,
      },
    ],
  },
  3: {
    deepen: `<div class="callout"><span class="tt">pegadinhas de prova</span>O teste estático encontra <b>defeitos</b>, nunca falhas (nada é executado). <b>Walkthrough</b> é conduzido pelo <b>autor</b>; a <b>inspeção</b>, pelo <b>moderador</b>. Na inspeção o autor nunca é líder da revisão nem relator.</div>
      <p><b>Formalidade crescente:</b> informal → walkthrough → revisão técnica → inspeção. Só a partir da técnica há preparação individual e relatório; só a inspeção usa regras, listas de verificação e métricas.</p>
      <p><b>Atividades da revisão (ordem):</b> planejamento → início → revisão individual → comunicação e análise das anomalias → correção e relato.</p>
      <p><b>Papéis:</b> autor · gerente (decide recursos) · líder da revisão · facilitador/moderador (conduz) · revisor (acha anomalias) · escriba/redator (registra).</p>`,
    intro:
      "Revisões e análise estática — encontrar defeitos sem executar o software. Curto, com pontos fáceis em papéis, tipos de revisão e fatores de sucesso. Só K1 e K2.",
    sections: [
      {
        id: "3.1",
        label: "Noções básicas de teste estático",
        k: ["K1", "K2"],
        html: `<p><b>FL-3.1.1 K1 — Produtos examinados:</b> requisitos, histórias de usuários, critérios de aceite, código-fonte, planos de teste, casos de teste, backlog do produto, cartas de teste, documentação, contratos, modelos. Produtos <i>não</i> adequados: aqueles difíceis de interpretar por humanos e que ferramentas não conseguem analisar (ex.: código executável de terceiros por restrições legais).</p>
        <p><b>FL-3.1.2 K2 — Valor do teste estático:</b> detecta defeitos cedo (mais baratos de corrigir); encontra problemas que o dinâmico não pega — código inacessível/duplicado, requisitos ambíguos/incompletos, desvios de padrão, vulnerabilidades de segurança, especificações incorretas de interface. Cria entendimento compartilhado entre stakeholders.</p>
        <p><b>Defeitos típicos encontrados mais facilmente por teste estático:</b></p>
        <ul style="margin:.4rem 0;padding-left:1.2rem">
          <li>Requisitos: inconsistências, ambiguidades, contradições, omissões, duplicações</li>
          <li>Projeto: banco de dados ineficiente, modularização deficiente</li>
          <li>Código: variáveis indefinidas/não declaradas, código inacessível, complexidade excessiva</li>
          <li>Desvios de padrão: convenções de nomenclatura</li>
          <li>Interface: número/tipo/ordem de parâmetros incompatíveis</li>
          <li>Segurança: estouro de buffer</li>
          <li>Lacunas na cobertura da base de testes</li>
        </ul>
        <p><b>FL-3.1.3 K2 — Estático × Dinâmico:</b> estático não executa o código, encontra defeitos diretamente; dinâmico executa o código e produz falhas a partir das quais o defeito é determinado. Estático alcança caminhos raramente executados; aplica-se a artefatos não executáveis; mede características que não dependem da execução (ex.: capacidade de manutenção). Análise estática é frequentemente incorporada em pipelines CI.</p>
        <p><b>Análise estática automatizada</b> (linters, ferramentas de qualidade de código) verifica padrões de codificação, complexidade ciclomática e vulnerabilidades conhecidas — geralmente integrada ao pipeline de CI, antes mesmo dos testes dinâmicos.</p>
        <div class="callout"><span class="tt">exemplo</span>Ao revisar a especificação "o sistema deve responder rapidamente", um revisor aponta ambiguidade (requisito não testável — "rapidamente" não é mensurável). É um defeito de <b>requisito</b>, encontrado sem executar nada, exatamente o tipo de problema que o teste estático resolve antes que vire código.</div>`,
      },
      {
        id: "3.2",
        label: "Processo de feedback e revisão",
        k: ["K1", "K2"],
        html: `<p><b>FL-3.2.1 K1 — Benefícios do feedback antecipado:</b> evita mal-entendidos de requisitos, retrabalho dispendioso e prazos perdidos; promove entendimento compartilhado; permite que mudanças sejam implementadas mais cedo.</p>
        <p><b>FL-3.2.2 K2 — Atividades do processo de revisão (ISO 20246):</b></p>
        <dl class="term">
        <dt>Planejamento</dt><dd>Define escopo, objetivo, produto a revisar, características, áreas de foco, critérios de saída, esforço e prazos.</dd>
        <dt>Início</dt><dd>Garante que todos estejam preparados — acesso ao produto, papéis claros.</dd>
        <dt>Revisão individual</dt><dd>Cada revisor examina e registra anomalias, recomendações e perguntas.</dd>
        <dt>Comunicação e análise de problemas</dt><dd>Anomalias analisadas em reunião; cada uma recebe status, dono e ação.</dd>
        <dt>Correção e relatório</dt><dd>Relatório de defeitos criado; ao atingir critérios de saída, produto é aceito.</dd>
        </dl>
        <p><b>FL-3.2.3 K1 — Papéis:</b></p>
        <dl class="term"><dt>Gerente</dt><dd>Decide o que revisar e provê recursos (equipe e tempo).</dd><dt>Autor</dt><dd>Cria e corrige o produto.</dd><dt>Moderador/facilitador</dt><dd>Garante andamento eficaz, mediação, tempo seguro.</dd><dt>Relator/escriba</dt><dd>Registra anomalias, decisões e ações.</dd><dt>Revisor</dt><dd>Encontra anomalias — pode ser da equipe, especialista ou stakeholder.</dd><dt>Líder da revisão</dt><dd>Responsabilidade geral — decide quem participa e quando/onde ocorre.</dd></dl>
        <p><b>FL-3.2.4 K2 — Tipos (do menos ao mais formal):</b></p>
        <div class="callout"><span class="tt">escala</span><b>Informal</b> → <b>Walkthrough</b> (liderado pelo <i>autor</i>) → <b>Revisão Técnica</b> (moderador + especialistas, busca consenso técnico) → <b>Inspeção</b> (mais formal; métricas coletadas; <i>o autor não pode ser líder nem relator</i>; objetivo: máximo de anomalias).</div>
        <dl class="term">
        <dt>Informal</dt><dd>Sem processo definido nem resultado formal documentado; útil para feedback rápido.</dd>
        <dt>Walkthrough</dt><dd>Liderado pelo autor; sessão explicativa, pode ou não gerar registro formal.</dd>
        <dt>Revisão técnica</dt><dd>Conduzida por um moderador; foco técnico, busca consenso entre pares/especialistas; costuma usar checklist.</dd>
        <dt>Inspeção</dt><dd>A mais formal; papéis fixos, métricas coletadas, checklist obrigatório, critérios de entrada/saída bem definidos.</dd>
        </dl>
        <p><b>FL-3.2.5 K1 — Fatores de sucesso:</b> objetivos claros e critérios de saída mensuráveis (nunca avaliar o autor); tipo de revisão adequado ao contexto; revisões em pequenas partes; feedback aos autores e stakeholders; tempo suficiente para preparo; apoio da gerência; revisão como parte da cultura; treinamento adequado; facilitação de reuniões.</p>
        <p><b>Exemplo de itens de checklist</b> para revisar uma história de usuário: Cada critério de aceite é testável? Os cenários negativos foram considerados, além dos positivos? As dependências com outras histórias estão explícitas? Aspectos não funcionais relevantes (desempenho, segurança) foram mencionados? Uma checklist boa é curta, específica do produto revisado e revisada periodicamente com base nos defeitos mais recorrentes.</p>`,
      },
    ],
  },
  4: {
    deepen: `<div class="callout"><span class="tt">como não errar os cálculos</span>Partição de <b>a</b> a <b>b</b>: <b>3 partições</b> (1 válida + 2 inválidas). <b>BVA 2 valores</b>: limite + vizinho externo (a−1, a, b, b+1). <b>BVA 3 valores</b>: acrescenta o vizinho interno. Cobertura de instrução = instruções executadas ÷ total. <b>100% de ramo ⇒ 100% de instrução</b> (nunca o contrário).</div>
      <p><b>Exemplos rápidos:</b> 30 de 40 instruções = <b>75%</b>. Tabela de decisão com <b>n</b> condições booleanas independentes = <b>2ⁿ</b> colunas. Idade 18–65 → 3 partições; BVA 2 valores → 17, 18, 65, 66.</p>
      <p><b>Categorias de técnica:</b> caixa-preta (baseada na especificação) · caixa-branca (baseada na estrutura) · experiência (suposição de erro, exploratório, checklist).</p>
      <p><b>Colaborativas:</b> 3 Cs (Cartão, Conversa, Confirmação) · INVEST · critérios de aceite · ATDD (testes antes do código).</p>`,
    intro:
      "O capítulo de maior peso e o único com K3 forte: você precisa APLICAR as técnicas de caixa-preta para derivar casos de teste, não só reconhecê-las.",
    sections: [
      {
        id: "4.1",
        label: "Visão geral das técnicas de teste",
        k: ["K2"],
        html: `<p><b>FL-4.1.1 K2:</b> técnicas dão suporte à análise (o que testar) e ao projeto (como testar), gerando um conjunto pequeno mas suficiente de casos de teste de forma sistemática. Referência: ISO/IEC/IEEE 29119-4.</p>
        <dl class="term">
        <dt>Caixa-preta (baseadas em especificações)</dt><dd>Derivam testes do comportamento externo sem conhecer a estrutura interna — se a implementação mudar mas o comportamento não, os casos ainda são úteis.</dd>
        <dt>Caixa-branca (baseadas na estrutura)</dt><dd>Derivam testes da implementação/estrutura interna; só criados após o projeto ou implementação.</dd>
        <dt>Baseadas na experiência</dt><dd>Usam conhecimento e experiência do testador; complementam as demais; podem detectar defeitos que as outras não pegam.</dd>
        </dl>
        <p><b>Como escolher a técnica:</b> considere o tipo de sistema, padrões regulatórios, nível de risco, objetivo do teste, documentação disponível, conhecimento do testador e tempo/orçamento. Combinar técnicas (ex.: particionamento de equivalência + valor limite, ou caixa-preta + baseada em experiência) costuma dar cobertura melhor do que uma técnica isolada.</p>
        <p><b>Cobertura não é garantia de qualidade:</b> 100% de cobertura de instrução, decisão ou partições mede quanto da estrutura/especificação foi <i>exercitada</i> — não prova ausência de defeitos (princípio 1, capítulo 1). É possível ter 100% de cobertura e ainda deixar passar um defeito, se o resultado esperado não for verificado corretamente.</p>`,
      },
      {
        id: "4.2",
        label: "Técnicas de teste caixa-preta",
        k: ["K3"],
        html: `<p><b>FL-4.2.1 K3 — Particionamento de Equivalência (EP):</b> divide dados em partições cujos elementos são processados da mesma forma — um representante por partição é suficiente. Partições válidas (processadas) e inválidas (rejeitadas). <b>Cobertura:</b> nº de partições executadas / total de partições identificadas. Com múltiplos parâmetros, usa-se <b>Each Choice Coverage (ECC)</b>: cada partição de cada conjunto executada ao menos uma vez.</p>
        <div class="callout"><span class="tt">exemplo EP</span>Faixa 18–65 → 3 partições: inválida (&lt;18), válida (18–65), inválida (&gt;65). Um caso por partição = 3 casos mínimos.</div>
        <div class="callout"><span class="tt">exemplo ECC</span>Uma máquina de café tem 3 tamanhos × 5 níveis de açúcar. Testar <i>todas</i> as combinações exigiria 15 casos. Com <b>Each Choice Coverage</b>, basta garantir que cada tamanho e cada nível de açúcar apareça em pelo menos um caso — o maior conjunto (5 níveis de açúcar) define o mínimo: <b>5 casos</b> já cobrem todos os valores de ambos os parâmetros pelo menos uma vez.</div>
        <p><b>FL-4.2.2 K3 — Análise de Valor Limite (BVA):</b> só para partições <i>ordenadas</i>. Foca nos limites onde desenvolvedores mais erram.</p>
        <dl class="term">
        <dt>BVA 2 valores</dt><dd>Por limite: o próprio limite + vizinho da partição adjacente. Para 18–65: <b>17, 18</b> e <b>65, 66</b>.</dd>
        <dt>BVA 3 valores</dt><dd>Por limite: o limite + seus dois vizinhos. Para 18–65: <b>17, 18, 19</b> e <b>64, 65, 66</b>. Mais rigoroso — detecta erros como "if (x = 10)" quando deveria ser "if (x ≤ 10)".</dd>
        </dl>
        <p><b>FL-4.2.3 K3 — Tabela de Decisão:</b> modela combinações de condições → ações (regras de negócio). Notação: V/F/"-"/N/A para condições; X/branco para ações. <b>Cobertura:</b> colunas viáveis executadas. Ponto forte: abordagem sistemática para todas as combinações; detecta lacunas/contradições nos requisitos. Pode ser minimizada se houver muitas condições.</p>
        <p><b>FL-4.2.4 K3 — Transição de Estado:</b> modela estados, eventos, transições e ações. Diagrama de estados ou tabela de estados (mostra transições inválidas como células vazias).</p>
        <dl class="term">
        <dt>Cobertura de todos os estados</dt><dd>Mais fraca — visita todos os estados.</dd>
        <dt>Cobertura de transições válidas (0-switch)</dt><dd>Mais usada — executa todas as transições válidas.</dd>
        <dt>Cobertura de todas as transições</dt><dd>Mais forte — válidas + inválidas. Mínimo para software crítico.</dd>
        </dl>
        <div class="callout"><span class="tt">exemplo transição de estado</span>PIN de um cartão: estado "Ativo" + 3 tentativas erradas seguidas → estado "Bloqueado". Cobertura de todos os estados exige visitar "Ativo" e "Bloqueado"; cobertura de todas as transições exige testar também a tentativa de logar já bloqueado (transição inválida).</div>
        <p><b>Tabelas de decisão colapsadas:</b> quando uma condição não influencia o resultado de uma regra, ela pode ser marcada com "-" (não importa) e regras equivalentes combinadas, reduzindo o número de colunas sem perder cobertura lógica.</p>`,
      },
      {
        id: "4.3",
        label: "Técnicas de teste caixa-branca",
        k: ["K2"],
        html: `<p><b>FL-4.3.1 K2 — Cobertura de instrução:</b> % de instruções executáveis exercitadas. 100% garante que todas foram executadas ao menos uma vez — mas não detecta defeitos dependentes de dados nem garante que toda a lógica de decisão foi testada.</p>
        <p><b>FL-4.3.2 K2 — Cobertura de ramificação:</b> % de ramos (branches) do fluxo de controle exercitados — condicionais (if/switch/loop) e incondicionais. <b>Regra de ouro (v4.0):</b> 100% de <b>ramificação</b> ⇒ 100% de instrução, mas não o contrário. Ramificação substitui/é mais forte que instrução.</p>
        <p><b>FL-4.3.3 K2 — Valor do teste caixa-branca:</b> toda a implementação é considerada — detecta defeitos mesmo com especificação vaga/incompleta. Ponto fraco: se o software não implementou um requisito, o teste caixa-branca pode não detectar essa ausência. Fornece medição objetiva de cobertura; pode ser usado em testes estáticos (execuções secas de código) e em pseudocódigo.</p>
        <p><b>Cobertura de caminho (path coverage):</b> mede a proporção de caminhos completos e distintos pelo fluxo de controle exercitados — mais forte ainda do que a cobertura de ramificação, mas cresce exponencialmente com o número de decisões e loops. Não é exigida no Foundation Level, mas é útil saber que a hierarquia de rigor é instrução &lt; decisão/ramificação &lt; caminho.</p>
        <div class="callout"><span class="tt">exemplo</span>Um método com 10 instruções e uma única decisão if/else (2 ramos). Um teste que só passa pelo caminho "verdadeiro" dá 100% de cobertura de instrução nesse ramo, mas apenas 50% de cobertura de ramificação — falta exercitar o caminho "falso".</div>`,
      },
      {
        id: "4.4",
        label: "Técnicas de teste baseadas na experiência",
        k: ["K2"],
        html: `<p><b>FL-4.4.1 K2 — Suposição de erro:</b> antecipa erros, defeitos e falhas com base no conhecimento do testador (histórico do sistema, erros típicos de devs, falhas em sistemas similares). <b>Ataques a falhas:</b> abordagem metódica — criar/adquirir lista de possíveis erros e modelar testes que os identifiquem.</p>
        <p><b>FL-4.4.2 K2 — Teste exploratório:</b> projeto, execução e aprendizado <i>simultâneos</i>. Útil quando especificações são escassas ou há pressão de tempo. Pode ser estruturado em <b>sessões baseadas em sessões</b> com <b>test charters</b> (cartas com objetivos) e debriefing. Mais eficaz com testadores experientes e com conhecimento do domínio. Pode incorporar outras técnicas (ex.: EP).</p>
        <p><b>Estrutura de uma carta de teste (test charter):</b> missão/objetivo da sessão, escopo (o que está dentro e fora), recursos e referências disponíveis, e tempo alocado (time-box). A sessão encerra com um <b>debriefing</b>, registrando o que foi testado, o que foi encontrado e ideias para próximas sessões.</p>
        <div class="callout"><span class="tt">exemplo de carta</span><b>Missão:</b> explorar o fluxo de recuperação de senha em busca de falhas de segurança. <b>Escopo:</b> tela de recuperação e e-mail enviado; fora de escopo, o login normal. <b>Recursos:</b> conta de teste, acesso à caixa de e-mail. <b>Tempo:</b> 45 minutos, sessão única.</div>
        <p><b>FL-4.4.3 K2 — Teste baseado em checklist:</b> lista de condições a verificar — derivadas de experiência, padrões, riscos. Itens formulados como perguntas verificáveis diretamente. Não deve incluir itens automatizados, critérios de entrada/saída ou itens muito genéricos. Listas devem ser atualizadas regularmente com base em análise de defeitos. Sem casos detalhados, provê consistência mas menor repetibilidade.</p>`,
      },
      {
        id: "4.5",
        label: "Abordagens de teste baseadas na colaboração",
        k: ["K2", "K3"],
        html: `<p><b>FL-4.5.1 K2 — Escrita colaborativa de histórias de usuários:</b> histórias com os <b>3 C</b>: Cartão (meio), Conversa (explicação), Confirmação (critérios de aceite). Formato: "Como [ator], quero [meta], para que eu possa [valor de negócio]". Qualidade INVEST: <b>I</b>ndependente, <b>N</b>egociável, <b>V</b>aliosa, <b>E</b>stimável, <b>S</b>mall (pequena), <b>T</b>estável.</p>
        <p><b>FL-4.5.2 K2 — Critérios de aceite:</b> condições que a implementação deve atender; definem escopo, geram consenso, descrevem cenários positivos/negativos, servem de base para ATDD. Dois formatos:</p>
        <dl class="term">
        <dt>Orientado a cenários</dt><dd>Dado/Quando/Então (Given/When/Then — formato BDD).</dd>
        <dt>Orientado por regras</dt><dd>Lista de pontos de verificação ou tabela de mapeamento entrada/saída.</dd>
        </dl>
        <p><b>FL-4.5.3 K3 — ATDD:</b> casos de teste criados <i>antes</i> da implementação, colaborativamente (clientes, devs, testadores). Etapas: 1) workshop de especificação — analisa/escreve história e critérios; 2) criação dos casos — primeiro positivos, depois negativos, depois não funcionais. Casos expressos em linguagem natural com pré-condições, entradas e pós-condições. Automatizáveis via framework de automação → testes de aceite viram requisitos executáveis.</p>
        <div class="callout"><span class="tt">exemplo</span><b>História:</b> "Como cliente, quero recuperar minha senha por e-mail, para que eu possa acessar minha conta mesmo sem lembrar a senha." <b>Critério de aceite (Dado/Quando/Então):</b> Dado um e-mail cadastrado, Quando o cliente solicita a recuperação, Então um link válido por 1 hora é enviado.</div>
        <p><b>Cenário negativo correspondente (ordem do ATDD: positivo → negativo → não funcional):</b> Dado um e-mail <i>não</i> cadastrado, Quando o cliente solicita a recuperação, Então o sistema exibe uma mensagem genérica de confirmação, sem revelar se o e-mail existe na base (evita vazar quais e-mails estão cadastrados).</p>`,
      },
    ],
  },
  5: {
    deepen: `<div class="callout"><span class="tt">pegadinhas de prova</span>Nível de risco = <b>probabilidade × impacto</b>. Risco de <b>projeto</b> (prazos, recursos, fornecedor) ≠ risco de <b>produto</b> (defeitos/qualidade). <b>Severidade</b> (impacto técnico) ≠ <b>prioridade</b> (urgência de negócio). Critérios de entrada = DoR; de saída = DoD.</div>
      <p><b>PERT (três pontos):</b> E = (otimista + 4 × mais provável + pessimista) / 6. Ex.: (2 + 4×11 + 14) / 6 = <b>10</b>.</p>
      <p><b>Estimativa:</b> baseada em <b>métricas</b> (dados históricos) vs. baseada em <b>especialistas</b> (Wideband Delphi / Planning Poker).</p>
      <p><b>Pirâmide:</b> base larga de testes de unidade, topo estreito de UI/E2E. <b>Quadrantes:</b> eixos negócio/tecnologia × apoiar a equipe/avaliar o produto.</p>`,
    intro:
      "Segundo maior peso e também com K3: planejamento, estimativa, priorização, riscos, monitoramento e gestão de defeitos.",
    sections: [
      {
        id: "5.1",
        label: "Planejamento de teste",
        k: ["K1", "K2", "K3"],
        html: `<p><b>FL-5.1.1 K2 — Plano de teste:</b> documenta objetivos, recursos e processos. Conteúdo típico: contexto (escopo, objetivos, restrições, base de teste), premissas, stakeholders, comunicação, registro de riscos, abordagem (níveis, tipos, técnicas, critérios de entrada/saída, independência, métricas, dados e ambiente), orçamento e cronograma. Referência: ISO/IEC/IEEE 29119-3.</p>
        <p><b>Abordagens (estratégias) de teste:</b> orientam como o esforço de teste é planejado e conduzido dentro do plano de teste.</p>
        <dl class="term">
        <dt>Analítica</dt><dd>Baseada em análise formal ou informal, ex.: teste baseado em risco ou em requisitos.</dd>
        <dt>Baseada em modelos</dt><dd>Usa um modelo de aspecto-chave do sistema (funcional, de risco, de estado, de dados) para derivar os testes.</dd>
        <dt>Metódica</dt><dd>Segue um conjunto predefinido de condições de teste, como um catálogo de características de qualidade ou uma checklist.</dd>
        <dt>Conforme às normas (process-compliant)</dt><dd>Segue os processos definidos por um padrão externo, ex.: regulatório.</dd>
        <dt>Reativa (dinâmica/heurística)</dt><dd>Os testes reagem a eventos durante a execução — ex.: teste exploratório e suposição de erro; menos planejamento prévio.</dd>
        <dt>Consultiva</dt><dd>Guiada pela orientação de stakeholders, especialistas de domínio ou de tecnologia externos à equipe de teste.</dd>
        <dt>Avessa à regressão</dt><dd>Foca em minimizar o risco de regressão — forte reuso de testware existente e automação em larga escala.</dd>
        </dl>
        <p>Uma estratégia real geralmente combina mais de uma abordagem — como no caso do termostato inteligente, que mistura reativa (aceite baseado em experiência), conforme às normas (algoritmos verificados contra regulamento), analítica (teste funcional baseado em risco) e consultiva (segurança com especialistas externos).</p>
        <p><b>FL-5.1.2 K1 — Contribuição do testador ao planejamento ágil:</b> no <b>planejamento de liberação</b> (release) — escreve histórias/critérios testáveis, análise de risco, estimativa de esforço, define abordagem. No <b>planejamento de iteração</b> — análise de risco detalhada das histórias, testabilidade, divisão em tarefas de teste, estimativa.</p>
        <p><b>FL-5.1.3 K2 — Critérios de entrada e saída:</b> <b>entrada</b> = condições prévias para iniciar uma atividade (recursos disponíveis, testware pronto, qualidade inicial aceitável — ex.: smoke tests passando). <b>Saída</b> = o que deve ser alcançado para declarar a atividade concluída (cobertura, defeitos não resolvidos, testes planejados executados). No ágil: <b>DoR</b> (Definition of Ready) = critérios de entrada; <b>DoD</b> (Definition of Done) = critérios de saída. Esgotamento de prazo/orçamento também pode ser critério de saída válido.</p>
        <p><b>FL-5.1.4 K3 — Técnicas de estimativa:</b></p>
        <dl class="term">
        <dt>Baseada em índices (razão)</dt><dd>Dados históricos de projetos anteriores geram "indicadores padrão". Ex.: razão dev:teste = 3:2.</dd>
        <dt>Extrapolação</dt><dd>Medições do projeto atual são extrapoladas. Adequada em SDLCs iterativos.</dd>
        <dt>Wideband Delphi</dt><dd>Especialistas estimam isoladamente; discutem desvios; reestimam até consenso. Planning Poker é variante ágil.</dd>
        <dt>Três pontos (PERT)</dt><dd>E = (o + 4m + p) / 6; desvio-padrão SD = (p − o) / 6. Reduz peso dos extremos.</dd>
        </dl>
        <p><b>FL-5.1.5 K3 — Priorização de casos de teste:</b> <b>por risco</b> (riscos mais importantes primeiro), <b>por cobertura</b> (maior cobertura primeiro; variante: cobertura adicional), <b>por requisitos</b> (requisitos mais importantes dos stakeholders primeiro). Dependências entre casos e disponibilidade de recursos também influenciam a ordem.</p>
        <p><b>FL-5.1.6 K1 — Pirâmide de teste:</b> modelo de granularidade — base ampla (componentes: rápidos, isolados, baratos, muitos) → meio (integração) → topo estreito (UI/E2E: lentos, caros, frágeis, poucos). Apoia automação e alocação de esforço.</p>
        <p><b>FL-5.1.7 K2 — Quadrantes de teste (Marick):</b></p>
        <dl class="term">
        <dt>Q1 — Tecnologia / Apoia equipe</dt><dd>Componentes e integração de componentes; automatizados, incluídos no CI.</dd>
        <dt>Q2 — Negócio / Apoia equipe</dt><dd>Funcionais, exemplos, histórias de usuário, protótipos UX, APIs; verificam critérios de aceite; manuais ou automatizados.</dd>
        <dt>Q3 — Negócio / Avalia produto</dt><dd>Exploratório, usabilidade, aceite do usuário; orientados ao usuário; geralmente manuais.</dd>
        <dt>Q4 — Tecnologia / Avalia produto</dt><dd>Smoke tests e não funcionais (exceto usabilidade); geralmente automatizados.</dd>
        </dl>
        <p><b>Pirâmide × Quadrantes:</b> são lentes complementares, não concorrentes. A <b>pirâmide</b> orienta a granularidade e o volume de automação (mais testes pequenos, menos grandes); os <b>quadrantes</b> orientam o objetivo e o momento de cada teste (apoiar a equipe durante o desenvolvimento vs. avaliar o produto pronto). Um mesmo teste de componente automatizado é ao mesmo tempo "base da pirâmide" e "Q1".</p>`,
      },
      {
        id: "5.2",
        label: "Gerenciamento de risco",
        k: ["K1", "K2"],
        html: `<p><b>FL-5.2.1 K1 — Nível de risco = probabilidade × impacto.</b> Atividades: <b>análise de risco</b> (identificação + avaliação) e <b>controle de risco</b> (mitigação + monitoramento). Teste baseado em risco: atividades selecionadas, priorizadas e gerenciadas conforme análise de risco.</p>
        <p><b>FL-5.2.2 K2 — Tipos de risco:</b></p>
        <dl class="term">
        <dt>Risco de projeto</dt><dd>Gestão/controle: organizacionais (atrasos, estimativas imprecisas, corte de custos), pessoal (habilidades, conflitos, comunicação), técnicos (desvios de escopo, ferramentas), fornecedores (falha de terceiros, falência). Afeta cronograma, orçamento e escopo.</dd>
        <dt>Risco de produto</dt><dd>Qualidade (ISO 25010): funcionalidade errada, cálculos incorretos, erros de runtime, arquitetura ruim, algoritmos ineficientes, lentidão, UX ruim, vulnerabilidades. Consequências: insatisfação, perda de receita/reputação, danos, custos de manutenção, penalidades, danos físicos.</dd>
        </dl>
        <p><b>FL-5.2.3 K2 — Análise de risco do produto:</b> identificação (brainstorming, workshops, entrevistas, diagramas causa-efeito) + avaliação (categorização, probabilidade, impacto, nível, priorização). Abordagem quantitativa (probabilidade × impacto) ou qualitativa (matriz de risco). Resultados influenciam: escopo dos testes, níveis/tipos propostos, técnicas/cobertura, esforço estimado, ordem de priorização, atividades complementares.</p>
        <p><b>FL-5.2.4 K2 — Controle de risco do produto:</b> mitigação + monitoramento. Opções de resposta: mitigação por testes, aceite, transferência (seguro), plano de contingência. Ações de mitigação via teste: testadores experientes/adequados, independência adequada, revisões e análise estática, técnicas/cobertura adequadas, tipos de teste que abordam as características afetadas, testes dinâmicos incluindo regressão.</p>
        <div class="callout"><span class="tt">exemplo</span>Risco: "o módulo de pagamento pode calcular o imposto errado". Probabilidade: alta (lógica complexa, poucos testes unitários). Impacto: alto (perda financeira, reputação). Nível de risco: alto → prioridade máxima de teste nesse módulo, com técnicas mais rigorosas e maior cobertura.</div>
        <p><b>FMEA (Failure Mode and Effect Analysis):</b> técnica estruturada de análise de risco do produto. Para cada componente, lista-se os possíveis <b>modos de falha</b> (o que pode dar errado), seus <b>efeitos</b> (impacto no usuário/sistema) e <b>causas</b>; cada combinação recebe notas de severidade, probabilidade de ocorrência e dificuldade de detecção, cujo produto prioriza onde investir o esforço de teste.</p>`,
      },
      {
        id: "5.3",
        label: "Monitoramento, controle e conclusão do teste",
        k: ["K1", "K2"],
        html: `<p><b>FL-5.3.1 K1 — Métricas de teste:</b> progresso do projeto (tarefas concluídas, recursos, esforço), progresso do teste (casos implementados/executados/passados/falhos, tempo de execução), qualidade do produto (disponibilidade, tempo de resposta, MTTF), defeitos (encontrados/corrigidos, densidade, DDR), risco (nível residual), cobertura (requisitos, código) e custo.</p>
        <p><b>FL-5.3.2 K2 — Relatórios de teste:</b></p>
        <dl class="term">
        <dt>Relatório de progresso</dt><dd>Gerado regularmente durante o teste; inclui: período, progresso (adiantado/atrasado), impedimentos e soluções, métricas, novos/alterados riscos, testes planejados para o próximo período.</dd>
        <dt>Relatório de conclusão</dt><dd>Preparado ao final de fase/nível/tipo; inclui: resumo do teste, avaliação da qualidade vs. plano, desvios, impedimentos, métricas, riscos não mitigados, defeitos não corrigidos, lições aprendidas. Referência: ISO/IEC/IEEE 29119-3.</dd>
        </dl>
        <p>Públicos diferentes requerem diferentes formatos e frequências — mesma equipe: informal/frequente; projeto concluído: formal/único.</p>
        <p><b>FL-5.3.3 K2 — Comunicação do status:</b> verbal, painéis (CI/CD, kanban, burn-down), comunicação eletrônica (e-mail, chat), documentação online, relatórios formais. Comunicação mais formal para equipes distribuídas.</p>
        <p><b>Painéis comuns:</b> burn-down/burn-up chart (trabalho restante × tempo), gráfico de defeitos abertos × fechados ao longo do tempo, e cobertura acumulada — ajudam a visualizar a tendência, não só o número absoluto no momento.</p>
        <p><b>Duas fórmulas úteis:</b> <b>densidade de defeitos</b> = número de defeitos / tamanho do produto (ex.: por mil linhas de código ou por ponto de função) — compara módulos entre si. <b>DDR (Defect Detection Ratio)</b> = defeitos encontrados pelo teste / (defeitos encontrados pelo teste + defeitos encontrados depois, em produção) — quanto mais perto de 1, mais eficaz foi o teste em capturar problemas antes da entrega.</p>`,
      },
      {
        id: "5.4",
        label: "Gerenciamento de configuração (CM)",
        k: ["K2"],
        html: `<p><b>FL-5.4.1 K2 — CM no teste:</b> identifica, controla e rastreia o testware como <b>itens de configuração</b> — planos, estratégias, condições, casos, scripts, resultados, registros e relatórios. Cada item tem ID único, versionamento e rastreabilidade de mudanças.</p>
        <p><b>Baseline:</b> item de configuração aprovado para teste; alterações só via processo formal de controle de alterações. É possível reverter para baseline anterior para reproduzir resultados de testes anteriores.</p>
        <p>O CM garante que todos os itens são identificados exclusivamente, controlados por versão, rastreados quanto a alterações e relacionados entre si. No DevOps, a CM costuma ser automatizada no pipeline de CI/CD.</p>
        <p><b>Na prática:</b> ferramentas de controle de versão (Git, SVN) e de gestão de testes atribuem um identificador único e uma versão a cada item; um release ou build é associado a uma baseline específica de testware, permitindo saber exatamente quais testes validaram qual versão do sistema.</p>
        <p><b>Exemplo de esquema de identificação:</b> <code>TC-CAP4-EP-003_v2</code> pode identificar o terceiro caso de teste de particionamento de equivalência do capítulo 4, na segunda versão — um esquema consistente facilita rastrear qual versão de cada item foi usada em qual execução.</p>`,
      },
      {
        id: "5.5",
        label: "Gerenciamento de defeitos",
        k: ["K3"],
        html: `<p><b>FL-5.5.1 K3 — Elaborar relatório de defeito:</b> anomalias relatadas podem se tornar defeitos reais ou outra coisa (falso positivo, solicitação de alteração). O processo inclui fluxo de trabalho da descoberta ao fechamento.</p>
        <p><b>Componentes de um relatório de defeito:</b></p>
        <ul style="margin:.4rem 0;padding-left:1.2rem">
          <li><b>ID exclusivo</b></li>
          <li><b>Título</b> com breve resumo da anomalia</li>
          <li><b>Data, organização, autor</b> e cargo</li>
          <li><b>Objeto de teste e ambiente</b> de teste</li>
          <li><b>Contexto</b> (caso de teste, atividade, fase do SDLC, técnica usada, dados)</li>
          <li><b>Passos para reproduzir</b> + logs, prints, gravações</li>
          <li><b>Resultado esperado × resultado real</b></li>
          <li><b>Severidade</b> (impacto técnico no sistema) e <b>Prioridade</b> (urgência da correção — negócio)</li>
          <li><b>Status</b> (aberto, adiado, duplicado, aguardando correção, aguardando reteste, reaberto, fechado, rejeitado)</li>
          <li><b>Referências</b> ao caso de teste</li>
        </ul>
        <p>Severidade ≠ prioridade: um bug cosmético pode ter alta prioridade (na tela de login) e baixa severidade técnica.</p>
        <p><b>Ciclo de vida típico de um defeito:</b> Novo/Aberto → Em análise → Confirmado/Atribuído → Em correção → Corrigido → Em reteste → Fechado (ou Reaberto, se o reteste falhar; ou Rejeitado/Duplicado, se não for um defeito válido).</p>
        <div class="callout"><span class="tt">ruim vs. bom</span><b>Relatório fraco:</b> "O login não funciona." <b>Relatório bom:</b> "Ao logar com e-mail válido e senha correta em Chrome 126/Windows 11, o sistema retorna erro 500 (esperado: redirecionar ao painel). Passos: 1) acessar /login; 2) preencher credenciais válidas; 3) clicar em Entrar. Reproduzido em 3/3 tentativas." O segundo é acionável; o primeiro exige que o desenvolvedor investigue do zero.</div>`,
      },
    ],
  },
  6: {
    deepen: `<div class="callout"><span class="tt">pegadinhas de prova</span>O maior risco da automação é <b>subestimar a manutenção</b> dos scripts. Automação não elimina testadores, não garante ausência de defeitos e não substitui o teste exploratório. Boa prática de adoção: começar por um <b>projeto-piloto</b>.</div>
      <p><b>Decidir automatizar:</b> compare o custo de criar + manter os scripts com o de repetir o teste manualmente ao longo do tempo. Regressão estável compensa; UI que muda muito, menos.</p>
      <p><b>Categorias úteis:</b> gerenciamento de teste · análise estática · execução/automação · preparação de dados · desempenho e monitoramento.</p>`,
    intro:
      "O capítulo mais curto. Categorias de ferramentas e os benefícios e riscos da automação. Só K1 e K2.",
    sections: [
      {
        id: "6.1",
        label: "Suporte de ferramentas para testes",
        k: ["K2"],
        html: `<p><b>FL-6.1.1 K2 — Categorias de ferramentas de teste:</b></p>
        <dl class="term">
        <dt>Gerenciamento</dt><dd>SDLC, requisitos, testes, defeitos e configuração — aumentam eficiência do processo.</dd>
        <dt>Teste estático</dt><dd>Dão suporte a revisões e análise estática.</dd>
        <dt>Projeto e implementação</dt><dd>Facilitam geração de casos de teste, dados e procedimentos.</dd>
        <dt>Execução e cobertura</dt><dd>Automatizam execução e medem cobertura.</dd>
        <dt>Teste não funcional</dt><dd>Permitem testes difíceis ou impossíveis manualmente (carga, performance, segurança).</dd>
        <dt>DevOps</dt><dd>Suporte ao pipeline CI/CD, rastreamento de fluxo, builds automatizadas.</dd>
        <dt>Colaboração</dt><dd>Facilitam a comunicação da equipe.</dd>
        <dt>Infraestrutura</dt><dd>VMs, contêineres — escalabilidade e padronização da implantação.</dd>
        </dl>
        <p>Até uma planilha é uma ferramenta de teste no contexto adequado.</p>
        <p><b>Open-source vs. comercial:</b> ferramentas open-source costumam ter menor custo inicial, mas podem exigir mais esforço de customização e dependem do suporte da comunidade; ferramentas comerciais oferecem suporte dedicado, ao custo de maior dependência do fornecedor (ver riscos na seção 6.2).</p>
        <p><b>Integração entre ferramentas:</b> o valor de uma ferramenta cresce quando ela se integra a outras do ecossistema — por exemplo, uma ferramenta de execução que registra resultados automaticamente numa ferramenta de gerenciamento de defeitos, ou um pipeline de CI que aciona testes e publica cobertura sem intervenção manual. Ferramentas isoladas (silos) reduzem esse ganho.</p>`,
      },
      {
        id: "6.2",
        label: "Benefícios e riscos da automação de teste",
        k: ["K1"],
        html: `<p><b>FL-6.2.1 K1 — Benefícios da automação:</b></p>
        <ul style="margin:.4rem 0;padding-left:1.2rem">
          <li>Reduz trabalho manual repetitivo (regressão, reinserção de dados, comparação de resultados)</li>
          <li>Maior consistência e repetibilidade — menos erros humanos</li>
          <li>Avaliação mais objetiva (cobertura) e métricas complexas</li>
          <li>Acesso mais fácil a informações para gerenciamento e relatórios</li>
          <li>Tempos de execução menores → detecção antecipada de defeitos, feedback mais rápido</li>
          <li>Mais tempo para testadores criarem testes novos e mais profundos</li>
        </ul>
        <p><b>Riscos da automação:</b></p>
        <ul style="margin:.4rem 0;padding-left:1.2rem">
          <li>Expectativas irreais sobre funcionalidade e facilidade de uso</li>
          <li>Subestimar tempo/custo/esforço de introdução e manutenção dos scripts</li>
          <li>Usar automação onde o teste manual seria mais apropriado</li>
          <li>Confiar demais na ferramenta (ignorar pensamento crítico humano)</li>
          <li>Dependência do fornecedor (fechamento, aposentadoria, venda, suporte ruim)</li>
          <li>Software open-source abandonado ou com atualizações frequentes necessárias</li>
          <li>Incompatibilidade com a plataforma de desenvolvimento</li>
          <li>Ferramenta inadequada para requisitos normativos/de segurança</li>
        </ul>
        <p><b>Antes de adotar uma ferramenta:</b> avalie a maturidade do processo atual, o orçamento disponível, o treinamento necessário e a compatibilidade com o ambiente técnico existente.</p>
        <p><b>Boa prática:</b> iniciar com um <b>projeto-piloto</b> para avaliar o ajuste com o contexto antes da adoção ampla — ele revela o que precisaria mudar nos processos, calibra expectativas e testa a integração com as ferramentas já em uso.</p>
        <p><b>Vale a pena automatizar?</b> Um jeito simples de decidir: compare o custo de introdução e manutenção dos scripts com o custo de repetir o teste manualmente ao longo do tempo. Testes executados poucas vezes ou muito instáveis (UI que muda com frequência) tendem a compensar menos do que testes de regressão estáveis e repetidos a cada build.</p>`,
      },
    ],
  },
};
