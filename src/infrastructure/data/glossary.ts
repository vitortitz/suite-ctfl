import type { ChapterId } from "@/domain/types";

/**
 * Glossário CTFL v4.0 (termo → definição concisa), alinhado ao Glossário ISTQB e
 * ao syllabus v4.0. `chapter` indica o capítulo onde o termo é mais relevante,
 * usado para o filtro por capítulo. Textos escritos de forma própria e condensada.
 */
export interface GlossaryTerm {
  term: string;
  def: string;
  chapter: ChapterId;
  /** Sinônimos/termo em inglês, para ajudar na busca. */
  aka?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  // ---------------- Capítulo 1 ----------------
  { term: "Teste", def: "Conjunto de atividades — estáticas e dinâmicas — para avaliar a qualidade de produtos de trabalho e reduzir o risco de falhas em operação.", chapter: 1, aka: "testing" },
  { term: "Erro", def: "Engano humano cometido por uma pessoa, que pode introduzir um defeito no produto de trabalho.", chapter: 1, aka: "mistake / error" },
  { term: "Defeito", def: "Imperfeição em um produto de trabalho, causada por um erro; pode provocar uma falha quando executado.", chapter: 1, aka: "bug / defect" },
  { term: "Falha", def: "Comportamento incorreto observado ao executar um defeito; desvio entre o resultado real e o esperado.", chapter: 1, aka: "failure" },
  { term: "Causa-raiz", def: "Motivo fundamental de um problema, identificado por análise de causa-raiz; tratá-la evita defeitos futuros semelhantes.", chapter: 1, aka: "root cause" },
  { term: "Verificação", def: "Confirmação de que o produto foi construído corretamente, conforme a especificação.", chapter: 1, aka: "verification" },
  { term: "Validação", def: "Confirmação de que o produto certo foi construído — que atende às necessidades reais do usuário.", chapter: 1, aka: "validation" },
  { term: "Depuração", def: "Atividade de desenvolvimento que reproduz uma falha, diagnostica sua causa e corrige o defeito. Diferente de testar.", chapter: 1, aka: "debugging" },
  { term: "Garantia da qualidade (QA)", def: "Abordagem preventiva, orientada ao processo, que garante que os processos produzam qualidade adequada.", chapter: 1, aka: "quality assurance" },
  { term: "Controle da qualidade (QC)", def: "Abordagem corretiva, orientada ao produto; o teste é uma forma de controle de qualidade.", chapter: 1, aka: "quality control" },
  { term: "Base de teste", def: "Conjunto de fontes das quais as condições de teste são derivadas: requisitos, histórias, design, código, experiência.", chapter: 1, aka: "test basis" },
  { term: "Testware", def: "Produtos de trabalho gerados nas atividades de teste: planos, condições, casos, dados, scripts, relatórios.", chapter: 1 },
  { term: "Condição de teste", def: "Aspecto testável de um componente ou sistema, identificado como base para os testes.", chapter: 1, aka: "test condition" },
  { term: "Caso de teste", def: "Conjunto de pré-condições, entradas, ações, resultados esperados e pós-condições, derivado de condições de teste.", chapter: 1, aka: "test case" },
  { term: "Rastreabilidade", def: "Ligação entre base de teste e testware; permite medir cobertura, avaliar impacto de mudanças e apoiar auditorias.", chapter: 1, aka: "traceability" },
  { term: "Abordagem de equipe inteira", def: "Prática em que todos na equipe são corresponsáveis pela qualidade; quem tem o conhecimento pode executar qualquer tarefa.", chapter: 1, aka: "whole-team approach" },
  { term: "Independência de teste", def: "Grau de separação entre quem cria o artefato e quem o testa; maior independência revela tipos diferentes de defeitos.", chapter: 1 },
  { term: "Ceticismo profissional", def: "Postura de questionar e não presumir que o software está correto — base da mentalidade do testador.", chapter: 1 },

  // ---------------- Capítulo 2 ----------------
  { term: "Nível de teste", def: "Grupo de atividades de teste organizadas e gerenciadas em conjunto (componente, integração, sistema, aceite).", chapter: 2, aka: "test level" },
  { term: "Teste de componente", def: "Nível que testa módulos/unidades isoladamente. Também chamado teste unitário.", chapter: 2, aka: "unit test" },
  { term: "Teste de integração", def: "Nível que verifica interfaces e interações entre componentes ou entre sistemas.", chapter: 2, aka: "integration test" },
  { term: "Teste de sistema", def: "Nível que avalia o comportamento e as capacidades do sistema como um todo, de ponta a ponta.", chapter: 2, aka: "system test" },
  { term: "Teste de aceite", def: "Nível que estabelece confiança para a entrega; inclui aceite do usuário (UAT), operacional, contratual/regulatório, alfa e beta.", chapter: 2, aka: "acceptance test" },
  { term: "Teste funcional", def: "Avalia o que o sistema faz (as funções que ele deve executar).", chapter: 2 },
  { term: "Teste não funcional", def: "Avalia o quão bem o sistema se comporta: desempenho, usabilidade, segurança, confiabilidade, portabilidade.", chapter: 2 },
  { term: "Teste caixa-preta", def: "Técnica baseada no comportamento/especificação, sem considerar a estrutura interna do código.", chapter: 2, aka: "black-box" },
  { term: "Teste caixa-branca", def: "Técnica baseada na estrutura interna do código (instruções, decisões, caminhos).", chapter: 2, aka: "white-box" },
  { term: "Teste de confirmação", def: "Reexecuta o caso que falhou para verificar se o defeito foi corrigido. Também chamado reteste.", chapter: 2, aka: "reteste / confirmation testing" },
  { term: "Teste de regressão", def: "Verifica que uma mudança não quebrou o que já funcionava; forte candidato à automação.", chapter: 2, aka: "regression testing" },
  { term: "Teste de manutenção", def: "Teste disparado por mudanças em um sistema em operação: correções, melhorias, migração ou aposentadoria.", chapter: 2, aka: "maintenance testing" },
  { term: "Análise de impacto", def: "Avaliação das consequências de uma mudança para determinar as áreas afetadas e o esforço de regressão.", chapter: 2, aka: "impact analysis" },
  { term: "TDD", def: "Test-Driven Development: escrever um teste que falha, o código mínimo para passar e refatorar (red-green-refactor).", chapter: 2, aka: "desenvolvimento orientado a testes" },
  { term: "ATDD", def: "Acceptance Test-Driven Development: derivar testes de aceite dos critérios de aceite, colaborativamente, antes de codificar.", chapter: 2 },
  { term: "BDD", def: "Behavior-Driven Development: descrever o comportamento em linguagem simples (dado/quando/então) compreensível por todos.", chapter: 2 },
  { term: "Shift-left", def: "Antecipar teste e revisão o mais cedo possível no ciclo, reduzindo o custo de correção dos defeitos.", chapter: 2 },
  { term: "DevOps", def: "Cultura e práticas que integram desenvolvimento e operações, com CI/CD e feedback rápido sobre a qualidade.", chapter: 2 },
  { term: "Retrospectiva", def: "Reunião que identifica o que funcionou, o que melhorar e como aplicar melhorias — motor da melhoria contínua.", chapter: 2 },

  // ---------------- Capítulo 3 ----------------
  { term: "Teste estático", def: "Exame de produtos de trabalho sem executá-los, por revisão (humana) ou análise estática (ferramenta). Encontra defeitos, não falhas.", chapter: 3, aka: "static testing" },
  { term: "Análise estática", def: "Avaliação automática de código ou modelos sem executá-los, apontando violações de padrão e código suspeito.", chapter: 3, aka: "static analysis" },
  { term: "Revisão", def: "Avaliação manual de um produto de trabalho para identificar anomalias; varia da informal à inspeção formal.", chapter: 3, aka: "review" },
  { term: "Revisão informal", def: "Tipo de revisão sem processo definido nem resultado documentado; barata e comum.", chapter: 3 },
  { term: "Walkthrough", def: "Revisão conduzida pelo autor, que apresenta o produto de trabalho; útil para aprendizado e consenso.", chapter: 3, aka: "revisão guiada" },
  { term: "Revisão técnica", def: "Revisão feita por pares/especialistas, com preparação individual e foco em decisões técnicas; produz relatório.", chapter: 3, aka: "technical review" },
  { term: "Inspeção", def: "O tipo de revisão mais formal: conduzida por moderador, com papéis, regras, listas de verificação e métricas.", chapter: 3, aka: "inspection" },
  { term: "Moderador", def: "Papel que conduz a reunião de revisão, mantém a ordem e garante um ambiente seguro. Também chamado facilitador.", chapter: 3, aka: "facilitador / moderator" },
  { term: "Escriba", def: "Papel que registra as anomalias, decisões e ações da reunião de revisão. Também chamado redator.", chapter: 3, aka: "redator / scribe" },
  { term: "Anomalia", def: "Qualquer condição que desvia do esperado, identificada durante uma revisão ou teste.", chapter: 3, aka: "anomaly" },

  // ---------------- Capítulo 4 ----------------
  { term: "Particionamento de equivalência", def: "Técnica caixa-preta que divide as entradas em partições tratadas igualmente; testa um representante de cada.", chapter: 4, aka: "equivalence partitioning" },
  { term: "Análise de valor limite", def: "Técnica caixa-preta que testa as bordas das partições ordenadas (variantes de 2 e de 3 valores).", chapter: 4, aka: "BVA / boundary value analysis" },
  { term: "Tabela de decisão", def: "Técnica que combina condições e ações para testar sistematicamente as regras de negócio.", chapter: 4, aka: "decision table" },
  { term: "Teste de transição de estados", def: "Técnica que modela estados, eventos, transições e ações; ideal para comportamento dependente de estado.", chapter: 4, aka: "state transition testing" },
  { term: "Cobertura de instrução", def: "Percentual de instruções executáveis do código exercitadas pelos testes.", chapter: 4, aka: "statement coverage" },
  { term: "Cobertura de ramo", def: "Percentual de decisões avaliadas como verdadeiro e falso; mais forte que a cobertura de instrução.", chapter: 4, aka: "branch/decision coverage" },
  { term: "Suposição de erros", def: "Técnica baseada em experiência que antecipa defeitos a partir de erros típicos e falhas passadas.", chapter: 4, aka: "error guessing" },
  { term: "Teste exploratório", def: "Abordagem em que projeto e execução ocorrem juntos, guiados por cartas de teste (test charters).", chapter: 4, aka: "exploratory testing" },
  { term: "Teste baseado em checklist", def: "Técnica baseada em experiência que verifica itens de uma lista derivada da experiência e do que importa ao usuário.", chapter: 4, aka: "checklist-based" },
  { term: "Carta de teste", def: "Documento que define objetivo, escopo e duração de uma sessão de teste exploratório.", chapter: 4, aka: "test charter" },
  { term: "Critérios de aceite", def: "Condições que uma história de usuário deve satisfazer para ser aceita pelos stakeholders.", chapter: 4, aka: "acceptance criteria" },
  { term: "Cobertura de teste", def: "Grau em que a base de teste foi exercitada pelos testes, expresso em porcentagem.", chapter: 4, aka: "test coverage" },

  // ---------------- Capítulo 5 ----------------
  { term: "Plano de teste", def: "Documento que descreve objetivos, escopo, abordagem, recursos, cronograma e critérios das atividades de teste.", chapter: 5, aka: "test plan" },
  { term: "Critérios de entrada", def: "Condições que devem ser satisfeitas para iniciar uma atividade de teste. No ágil, a Definition of Ready (DoR).", chapter: 5, aka: "entry criteria" },
  { term: "Critérios de saída", def: "Condições que definem quando parar ou concluir uma atividade de teste. No ágil, a Definition of Done (DoD).", chapter: 5, aka: "exit criteria" },
  { term: "Risco", def: "Evento incerto de efeito negativo; seu nível combina a probabilidade de ocorrência e o impacto caso ocorra.", chapter: 5, aka: "risk" },
  { term: "Risco de projeto", def: "Risco que afeta a capacidade do projeto de atingir objetivos (prazos, recursos, fornecedores, pessoas).", chapter: 5 },
  { term: "Risco de produto", def: "Risco de que o produto falhe ou tenha baixa qualidade (defeitos), afetando usuários ou o negócio.", chapter: 5 },
  { term: "Teste baseado em risco", def: "Abordagem que usa a análise de risco para priorizar e alocar o esforço de teste.", chapter: 5, aka: "risk-based testing" },
  { term: "Pirâmide de testes", def: "Modelo que sugere muitos testes rápidos na base (unidade) e poucos testes lentos no topo (UI/ponta a ponta).", chapter: 5, aka: "test pyramid" },
  { term: "Quadrantes de teste", def: "Modelo que equilibra os tipos de teste por foco (negócio/tecnologia) e propósito (apoiar a equipe/avaliar o produto).", chapter: 5, aka: "testing quadrants" },
  { term: "Severidade", def: "Grau de impacto técnico de um defeito sobre o sistema.", chapter: 5, aka: "severity" },
  { term: "Prioridade", def: "Urgência de correção de um defeito sob a ótica do negócio; pode divergir da severidade.", chapter: 5, aka: "priority" },
  { term: "Relatório de defeito", def: "Registro de um defeito com identificação, descrição, passos para reproduzir, severidade e prioridade.", chapter: 5, aka: "defect report" },
  { term: "Gerenciamento de configuração", def: "Mantém a integridade e o versionamento dos itens de teste, garantindo rastreabilidade e reprodutibilidade.", chapter: 5, aka: "configuration management" },
  { term: "Baseline", def: "Item de configuração aprovado, alterável apenas por processo formal; permite reproduzir resultados de forma confiável.", chapter: 5 },
  { term: "Estimativa de três pontos", def: "Técnica em que o esforço esperado = (otimista + 4 × mais provável + pessimista) / 6.", chapter: 5, aka: "PERT" },

  // ---------------- Capítulo 6 ----------------
  { term: "Ferramenta de teste", def: "Software que apoia atividades de teste, como gerenciamento, execução, análise estática ou preparação de dados.", chapter: 6, aka: "test tool" },
  { term: "Ferramenta de gerenciamento de teste", def: "Organiza e rastreia casos, execuções e defeitos, com rastreabilidade à base de teste e relatórios.", chapter: 6 },
  { term: "Automação de testes", def: "Uso de software para executar testes e comparar resultados; reduz esforço repetitivo, útil para regressão.", chapter: 6, aka: "test automation" },
  { term: "Ferramenta de preparação de dados", def: "Gera e gerencia a massa de dados de teste, apoiando a implementação e a execução.", chapter: 6, aka: "test data preparation" },
  { term: "Integração contínua (CI)", def: "Prática de integrar e testar mudanças com frequência, automaticamente, a cada commit.", chapter: 6, aka: "continuous integration" },
];
