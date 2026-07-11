import { describe, it, expect } from "vitest";
import { formatPrompt } from "@/presentation/questionFormat";

describe("formatPrompt", () => {
  it("mantém enunciado simples como stem único", () => {
    const out = formatPrompt("Qual das opções NÃO é um objetivo típico do teste?");
    expect(out).toContain('class="q-stem"');
    expect(out).not.toContain("q-list");
    expect(out).not.toContain("q-match");
  });

  it("estrutura questões de combinação (itens 1- e descrições A-)", () => {
    const raw =
      "Combine os seguintes produtos de trabalho de teste (1-4) com a descrição correta (A-D): 1- Conjunto de teste; 2- Caso de teste; 3- Roteiro de teste; 4- Carta de teste. A- Um conjunto de scripts de teste a serem executados em uma execução de teste específica; B- Um conjunto de instruções para a execução de um teste; C- Contém os resultados esperados; D- Documentação das atividades de teste em testes exploratórios baseados em sessões.";
    const out = formatPrompt(raw);
    expect(out).toContain("q-match");
    expect(out).toContain(">Itens<");
    expect(out).toContain(">Descrições<");
    // 4 itens numéricos + 4 descrições = 8 marcadores
    expect((out.match(/q-mk--/g) || []).length).toBe(8);
    expect(out).toContain("Conjunto de teste");
    expect(out).toContain("Documentação das atividades de teste");
    // a instrução vira o stem
    expect(out).toContain('class="q-stem"');
    expect(out).toContain("Combine os seguintes produtos");
  });

  it("estrutura cenário com pontos numerados (1)…(4) + pergunta final", () => {
    const raw =
      "Dadas as seguintes declarações: (1) Cada atividade de desenvolvimento deve ter uma atividade de teste correspondente. (2) A revisão deve começar assim que as versões finais estiverem disponíveis. (3) O projeto de testes deve começar durante a atividade correspondente. (4) As atividades de teste devem começar cedo. Quais dos seguintes CORRETAMENTE mostram quais são verdadeiros e quais são falsos?";
    const out = formatPrompt(raw);
    expect(out).toContain("q-list");
    expect((out.match(/<li>/g) || []).length).toBe(4);
    expect(out).toContain('class="q-stem"');
    expect(out).toContain("Quais dos seguintes CORRETAMENTE");
    // a pergunta fica no stem, e o último item termina antes dela
    expect(out).toContain("<span>As atividades de teste devem começar cedo</span>");
    expect(out).not.toContain("cedo. Quais");
  });

  it("estrutura cenário com duas famílias (a)…(d) e (1)…(4)", () => {
    const raw =
      "Dadas as seguintes atividades e tarefas de teste: (a) Projeto do teste (b) Implementação de testes (c) Execução de testes (d) Conclusão do teste; (1) Entrada de pedidos de alteração (2) Identificação de dados de teste (3) Priorização de procedimentos (4) Analisar as discrepâncias. Qual dos seguintes MELHOR combina as atividades com as tarefas?";
    const out = formatPrompt(raw);
    expect(out).toContain("q-match");
    expect((out.match(/<ul class="q-list">/g) || []).length).toBe(2);
    expect(out).toContain("Projeto do teste");
    expect(out).toContain("Analisar as discrepâncias");
    expect(out).toContain("Qual dos seguintes MELHOR combina");
  });

  it("estrutura tuplas de caso de teste T1(…); T2(…)", () => {
    const raw =
      "Um gravador de radiação combina horas e intensidade. Casos de teste: T1(1,5h, Muito Baixa, 10); T2(7,0h, Média, 60); T3(0,5h, Muito Baixa, 10). Qual é o número mínimo de casos de teste adicionais necessários para garantir a cobertura total?";
    const out = formatPrompt(raw);
    expect(out).toContain("q-tuples");
    expect((out.match(/<li>/g) || []).length).toBe(3);
    expect(out).toContain(">T1<");
    expect(out).toContain("Muito Baixa");
    // decimal PT preservado (não deve virar "1" + "5h")
    expect(out).toContain(">1,5h<");
    expect(out).toContain("Qual é o número mínimo");
  });

  it("estrutura pontos com numeração '1.' … '2.'", () => {
    const raw =
      "O gerente de teste definiu: 1. O teste de aceite é executado como teste baseado na experiência. 2. Os algoritmos são verificados contra o padrão. 3. O teste funcional é executado como teste baseado em risco. 4. Os testes de segurança são executados com especialistas. Que quatro tipos de estratégias de teste o gerente implementou?";
    const out = formatPrompt(raw);
    expect(out).toContain("q-list");
    expect((out.match(/<li>/g) || []).length).toBe(4);
    expect(out).toContain("Que quatro tipos de estratégias");
  });

  it("converte marcadores romanos (i)…(v) para números convencionais", () => {
    const raw =
      "Quais das seguintes habilidades são as MAIS importantes para um testador? (i) ter conhecimento do domínio; (ii) criar uma visão do produto; (iii) ser um bom membro da equipe; (iv) planejar e organizar o trabalho da equipe; (v) pensamento crítico.";
    const out = formatPrompt(raw);
    expect(out).toContain("q-list");
    // romanos NÃO devem aparecer — são exibidos como números convencionais
    expect(out).not.toContain("q-mk--roman");
    expect(out).toContain("q-mk--num");
    expect((out.match(/<li>/g) || []).length).toBe(5);
    expect(out).toContain(">1<");
    expect(out).toContain(">5<");
    // a pergunta vem antes da lista e vira o stem
    expect(out).toContain('class="q-stem"');
    expect(out).toContain("MAIS importantes para um testador");
    expect(out).toContain("pensamento crítico");
  });

  it("na combinação (a)…(d) e (1)…(4), os números precedem as letras", () => {
    const raw =
      "Dadas as seguintes atividades e tarefas de teste: (a) Projeto do teste (b) Implementação de testes (c) Execução de testes (d) Conclusão do teste; (1) Entrada de pedidos de alteração (2) Identificação de dados de teste (3) Priorização de procedimentos (4) Analisar as discrepâncias. Qual dos seguintes MELHOR combina as atividades com as tarefas?";
    const out = formatPrompt(raw);
    expect(out).toContain("q-match");
    // a coluna de números (Itens) deve aparecer antes da coluna de letras (Descrições)
    expect(out.indexOf("q-mk--num")).toBeLessThan(out.indexOf("q-mk--alpha"));
  });

  it("estrutura tabela de decisão T1(Cond=SIM, …) como tabela real", () => {
    const raw =
      "Funcionários recebem bônus se trabalharem mais de um ano e atingirem uma meta acordada. Tabela de decisão: T1(Empregado>1ano=SIM, Objetivo acordado=NÃO, Objetivo alcançado=NÃO, Bônus=NÃO); T2(NÃO, NÃO, NÃO, NÃO); T3(NÃO, SIM, SIM, NÃO); T4(SIM, SIM, SIM, SIM). Qual dos seguintes casos de teste está faltando na tabela de decisão acima?";
    const out = formatPrompt(raw);
    expect(out).toContain("q-dtable");
    // cabeçalhos das condições viram os rótulos das linhas
    expect(out).toContain("Empregado&gt;1ano");
    expect(out).toContain("Objetivo acordado");
    // as 4 regras viram colunas T1…T4
    expect(out).toContain(">T1<");
    expect(out).toContain(">T4<");
    // valores classificados
    expect(out).toContain("v-yes");
    expect(out).toContain("v-no");
    expect(out).toContain("Qual dos seguintes casos de teste está faltando");
  });

  it("não quebra prompts com um único '(1)' solto", () => {
    const raw = "O primeiro princípio (1) afirma que o teste mostra a presença de defeitos. Isso é verdadeiro?";
    const out = formatPrompt(raw);
    expect(out).toContain('class="q-stem"');
    expect(out).not.toContain("q-list");
  });
});
