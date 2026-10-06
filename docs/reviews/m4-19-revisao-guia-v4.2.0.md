# Revisão dos problemas após Sistema v4.1.3 e Guia v4.2.0

Data: 2026-10-06. **Rodada exclusivamente documental**, após o autor esclarecer que
quer specs antes de novas correções. Fontes autorais e código de aplicação preservados.

**Esclarecimento posterior do autor, na mesma data:** teste e rolagem resultante
posterior (Medicina→cura, ataque→dano) são operações distintas. A API não pode deduzir
a segunda pela fórmula da primeira. P-099 foi descartada expressamente pelo autor;
arquivo preservado só como memória, sem trabalho de implementação futuro.
O caso específico de Competência, incluído pelo Guia no próprio teste de NPC, fica
na revisão desse fluxo. [Fila consolidada das specs](../specs/backlog/revisao-documentos-sistema-v4.1.3-guia-v4.2.0.spec.md).

## O que já foi corrigido e o que ainda não foi

Na rodada anterior, P-097-01 alterou crítico de teste no motor, média do montador e
publicação dos PDFs novos. Testes com um pool D20 agora somam +2 uma vez; dano/cura
preservam sua regra de dobrar. Não foram implementados dadinho, ajustes, Competências
ou testes de atributo de NPC, nem as correções P-095/P-096. A revisão abaixo encontrou
uma diferença em fórmula com segundo pool: P-099. A proposta de correção automática
global foi posteriormente retirada pelo esclarecimento acima. Não está tudo corrigido.

Nesta rodada foram revisados documentos/código e preparadas specs; nenhuma nova
correção de aplicação, migração, alteração de teste ou atualização dos PDFs foi executada.

## As questões discutidas, confrontadas com a publicação

| Questão | O documento novo resolve? | O que falta na aplicação/spec |
|---|---|---|
| NPC só rolar D20 e não alcançar DT alta | Sim, quanto à composição: Nível + dados de Competência | m4-19 deve compor/registrar a fórmula; não inventar regra alternativa |
| Nível/Proficiência do NPC | Guia `:954`: Nível 0–20 funciona como Proficiência em todos os contextos | Somar Nível; Civil Nível0 soma zero, sem forçar todos os Civis a zero |
| Competências e bônus por Categoria | Nova seção `:970–987` com quantidade/dados/restrições | Campos, validação, seleção em criação/ficha e fórmula ainda ausentes |
| Atributos do NPC zerados | Guia `:958` agora permite retirar o ponto inicial | P-100: distribuidor/stepper da criação ainda impedem zero fora da exceção Civil |
| Dadinho por atributo | Regra de teste definida; botão é requisito de produto do autor | m4-19, sem implementação nesta rodada |
| Ajuste de D20 e bônus fixo de habilidade | Competência é outra fonte, não substitui ajuste manual | Manter mapas manuais previstos; não somar passivas lendo seu texto |
| Leitor autorizado | Livro não define autorização da aplicação | Decisão do autor mantida: vê valores/bônus apresentados, sem edição/rolagem; notas privadas |
| Ocultar rolagens | Livro não resolve controle público/privado | Rolagem privada sempre; apresentação do item ainda precisa respeitar essa declaração |
| Crítico em teste versus resultado posterior | Sistema `:1227–1233` distingue teste e dado resultante; autor esclareceu operações separadas | P-097-01 já executada; sem inferência automática. Revisar aplicação no fluxo escolhido, inclusive NPC |
| P-095/P-096 | Não: defeitos de fixtures/relógio, sem relação com regra do jogo | Specs de testes continuam em backlog, sem execução |
| P-093, arredondamento | Não: contradição permanece em Sistema `:1353–1363` | Estado ACEITO mantido; decisão anterior do autor vale para baixo |
| P-098, ponteiro documental | Não: livros não alteram link em MEMORY | Spec documental preparada, sem corrigir o link agora |

## Contrato atual de NPC

O Guia `:975–987` introduz Competências: Civil zero; Operativo duas com 1D4;
Veterano três com 1D6; Elite quatro com 2D6; Lendário cinco com 3D6. Nos atributos
escolhidos, o teste é maior D20 + Nível + dados de Categoria, acrescido de ajustes
manuais aplicáveis. Sem Competência, a soma de Nível continua, conforme `:954`.

Os dados de Categoria não aumentam quantidade de D20 ou atributo; habilidades não
podem aumentar quantidade/faces desses dados e crítico não os afeta. Atributo zero
não pode ser escolhido como Competência. O Guia `:1029` preserva a DT do NPC:
`10 + Nível + 2 × atributo`, sem dados de Categoria. A faixa de Nível é sugestão:
o Guia `:934` não restringe Nível pela Categoria. Não há obrigação de Civil Nível0.

Exemplo sem crítico: Veterano Nível6, atributo3 competente, D20 `[18,11,8]` e D6 `[4]`:
`18 + 6 + 4 = 28`. Sem Competência, seria 24. Assim a publicação resolve a
preocupação de progressão do teste sem mudar DT/Defesa/Vida/Energia.

Em `:1033–1037`, ataques usam Luta/Pontaria por padrão e recebem Competência quando
o atributo for competente. Equipamento define dano; acesso por Categoria não obriga
equipamento máximo e NPC não recebe Dano Furtivo automaticamente. Não criar novo
fluxo de ataque/inventário de passagem na m4-19.

## Defeitos confirmados para execução futura

### P-099 — Observação histórica da fórmula; proposta descartada

Leitura de `shared/src/regras/rolagem/rolagem.ts:712`: `ehFormulaTeste` exige
`formula.dados.length === 1`. Reprodução somente em memória com o shared já construído:

| Fórmula | Dados determinísticos | Atual | Expectativa da interpretação inicial |
|---|---|---|---|
| `3d20kh1cm1+6` | `[20,11,8]` | 28 | 28 |
| `3d20kh1cm1+6+1d6` | `[20,11,8,4]` | 30 | 32 |

O D20 informa crítico, mas o segundo pool desativa a identificação atual de teste.
A fórmula livre não informa se ela é teste, bonificação ou resultado; tampouco conhece
uma rolagem futura. O total32 na tabela foi a hipótese para um teste NPC explicitamente
competente, não aprovação de um classificador global. Autor rejeitou inferência de
resultado posterior. [P-099](../specs/backlog/p-099-critico-teste-com-dados-adicionais.spec.md)
registra agora o descarte e seu motivo, sem execução ou dependência da m4-19.
Aplicação do crítico e média do fluxo NPC serão revistas dentro do contrato escolhido,
sem estender o escopo automaticamente a Formação ou fórmulas arbitrárias.

### P-100 — NPC zero na criação

`shared/src/regras/npc/criacao.ts` ainda acusa “inicia em 1” para atributo zero;
`paginas/criar-npc/npc-atributos.component.html` fixa mínimo1 para controles habilitados.
A validação da ficha pronta já aceita inteiro não negativo, portanto não tratar todo
o modelo de NPC como incompatível. O defeito está no distribuidor/assistente de criação.
[Spec P-100](../specs/done/p-100-npc-criacao-atributo-zero.spec.md).

**Fecho posterior (2026-10-06):** P-100 executada e concluída após autorização do autor;
zero/redistribuição, troca de Categoria e foco do StepInput corrigidos. Gates e app real
nos quatro viewports em [P-100 — verificação](p-100-verificacao.md). Achado acima registra
o estado anterior à correção.

## Outras alterações observadas no Guia de Criaturas

A comparação textual normalizou espaços/escapes e desconsiderou imagens incorporadas;
sumário/paginação não foram tratados como mudanças de regra. Também apareceram:

- `:435`: realocar até três pontos no total a partir de vários atributos, podendo negativar.
  O helper `validarRealocacaoAtributos` ainda rejeita negativos; reprodução em memória
  retorna “social: valor abaixo de 0”. Divergência confirmada, registrada em P-101.
- `:457–461`: modificador soma ao resultado, não ao atributo/pool. A rolagem em
  `criatura-rolagem.ts` já faz isso; existe helper Atributo Efetivo e uso na ficha que
  precisam de inventário antes de afirmar quais outros consumidores devem mudar.
- `:485–492`: DT de Criatura `10 + atributo + trunc(modificador/2)`, inclusive negativo
  truncado em direção a zero. Não confundir com a DT do agente/NPC. Integração ainda
  precisa ser mapeada; a revisão não declara sua implementação concluída.
- Cadência: quando não houver espaço para intercalar, sobra vai ao fim da iniciativa.
  Conferência posterior localizou implementação em `shared/regras/encontro/ordem.ts`
  e teste “sem slots abaixo suficientes”; já corresponde à redação nova. Não refazer.
- A Estátua: fraqueza Explosão passou de20 para26, alinhando o mínimo já usado pelo
  motor; Esmagamento passa a3D12+4 e o teste de resistência usa DT Força17. Não migrar
  ataques livres de fichas antigas para o exemplo novo automaticamente.

[Spec P-101](../specs/done/p-101-criaturas-guia-v4.2.0.spec.md) reúne a matriz e
foi dividida em 01 (realocação), 02 (DT/modificadores), 03 (referências/Cadência).
Execução posterior autorizada e concluída em 2026-10-06;
[matriz final, gates e propostas editoriais](p-101-verificacao.md).
Links operacionais antigos encontrados em README/SCHEMA/design/specs geraram
[P-102](../specs/backlog/p-102-referencias-documentos-vigentes.spec.md).
A seção de equipamentos/ataques NPC ganhou [spec investigativa própria](../specs/backlog/npc-ataques-e-equipamentos-guia-v4.2.0.spec.md),
sem criar novo fluxo na m4-19. Comparação adicional do Sistema, normalizando também
`&nbsp;`/ênfase/escapes, confirmou apenas os três parágrafos de Crítico como mudanças
de conteúdo; não houve mudança nova de classe, equipamento ou progressão de Jogador.

## Pontos autorais que continuam merecendo revisão

- No exemplo A Estátua, `:817` ainda mostra Fraco +6 em VD30, enquanto a fórmula
  de `:477–483` dá `floor(-2 + 5×1,5) = 5`. Decisão de m4-02: fórmula geral vence.
- Em `:813–820`, Base2 e Social0 retiram dois pontos, mas a narrativa diz três
  redistribuídos. Não alterar os números do exemplo ou a regra por iniciativa do agente.
- O Sistema continua com arredondamento para baixo seguido de uma frase “para cima”:
  P-093 ACEITO. Arquivo chama-se v4.1.3, mas cabeçalho interno ainda informa v4.1.1;
  detalhe editorial já observado em P-097, sem alteração na fonte.
- UI de ocultação: alternância da Criatura versus “sempre ocultas”. As specs preservam
  privado; não exigem uma nova escolha de regra de teste/Competência/crítico já publicada.

## Verificação desta rodada

Leitura das fontes novas e dos trechos de código, comparação semântica do Guia com a
versão anterior no Git e reproduções determinísticas em memória, sem escrita em código,
dados ou testes. Conferência das specs, critérios, dependências e links documentais.
Nenhum build/suíte/gate visual novo: não houve implementação nesta rodada. Os gates da
correção anterior estão em [P-097-verificação](p-097-verificacao.md); não são prova de que
as adequações agora especificadas estejam prontas.
