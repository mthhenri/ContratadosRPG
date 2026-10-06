# revisao-documentos-sistema-v4.1.3-guia-v4.2.0.spec.md

> Guarda-chuva de revisão solicitado pelo autor em 2026-10-06.
> **Somente specs. Implementação aguarda revisão conjunta do autor.**
> Autor autorizou commitar a preparação destas specs em 2026-10-06;
> autorização restrita à documentação, sem execução das correções.
> Correções de P-097-01 já realizadas permanecem como estão; nenhum rollback implícito.
> P-095/P-096/P-098/P-100 tiveram execução autorizada separadamente e foram concluídas em 2026-10-06;
> demais tasks conservam suas autorizações e pendências próprias.

## Objetivo

Reunir todas as adequações identificadas pela publicação do Sistema v4.1.3 e do Guia
v4.2.0, as correções de testes discutidas e os pontos ainda sujeitos à decisão do autor.
Este arquivo coordena tasks; não é uma implementação única.

## Entregáveis

1. Manter a fila abaixo com origem, escopo e dependências verificáveis. Fontes autorais
   preservadas nesta rodada; specs em done são registro histórico.
2. Distinguir teste de atributo, dado de bonificação dentro do teste e rolagem posterior
   de dano/cura. A API não deduz a próxima ação pela fórmula. P-099 foi descartada;
   seu arquivo é memória, sem execução ou dependência da m4-19.
3. Revisar com o autor as decisões restantes antes de implementar seus recortes; depois
   executar tasks numeradas, com gates compartilhados quando o recorte integrado permitir.
   Commit desta preparação autorizado após apresentação das specs; commits de
   implementação continuam posteriores à execução/gates, com diff da tarefa e coautoria.

| Task | Escopo preparado | Dependência/estado |
|---|---|---|
| [P-095](../done/p-095-fixture-rolagens-feed-deterministica.spec.md) | Datas determinísticas e ordem do teste de reconexão | Concluída; testes e documentação |
| [P-096](../done/p-096-fixture-resumo-rolagem-deterministica.spec.md) | Data estável e fixture única no teste de espectador | Concluída; testes e documentação |
| [P-098](../done/p-098-ponteiros-auditoria-ficha-oculta.spec.md) | Ponteiros da spec arquivada; cobertura parcial da auditoria preservada | Concluída; documental |
| [P-099](p-099-critico-teste-com-dados-adicionais.spec.md) | Memória da proposta e motivo do descarte | DESCARTADA — NÃO EXECUTAR; arquivo preservado |
| [P-100](../done/p-100-npc-criacao-atributo-zero.spec.md) | Zero e redistribuição na criação de NPC | Concluída; gates e criação/reabertura em quatro viewports |
| [m4-19](../active/m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md) | Competências, ajustes, dadinho, leitura/privacidade | Regra publicada; crítico no fluxo explícito e controle visual sujeitos à revisão |
| [P-101-01](p-101-01-criatura-realocacao-atributos.spec.md) | Realocação total3, várias origens e negativo | Shared/criação/integração |
| [P-101-02](p-101-02-criatura-dt-e-modificadores.spec.md) | DT e consumidores do modificador fixo | Integração com negativos da 01 |
| [P-101-03](p-101-03-criatura-referencias-e-cadencia.spec.md) | Exemplos/referências; Cadência já compatível | DT da 02; preservar algoritmo correto |
| [P-102](p-102-referencias-documentos-vigentes.spec.md) | README/schema/design/specs operacionais e comentários | Não reescrever histórico nem trocar regra apenas por versão |
| [NPC ataques/equipamentos](npc-ataques-e-equipamentos-guia-v4.2.0.spec.md) | Investigação da seção nova e proposta de integração | Revisão antes de gerar tasks de implementação; não expandir m4-19 |

## Cobertura da comparação dos documentos

Comparação contra os livros anteriores no Git, normalizando espaços, `&nbsp;`, escapes,
ênfase Markdown e ignorando imagens incorporadas e paginação do sumário.

| Alteração textual | Destino/decisão |
|---|---|
| Sistema: três parágrafos de Crítico, incluindo cura como dado resultante | P-097-01 já executada; interpretação teste/resultado reaberta para revisão pelo esclarecimento do autor, sem inferência/rollback |
| Guia: Nível/atributos/Competências de NPC | m4-19 e P-100 |
| Guia: DTs contextuais de habilidades NPC | P-101-03, apenas onde referências do produto reproduzem o conteúdo |
| Guia: Ataques/Equipamentos, acesso por Categoria e ausência de Dano Furtivo padrão | Spec investigativa NPC ataques/equipamentos |
| Guia: realocação de vários atributos, zero/negativo | P-101-01 |
| Guia: modificador no total, DT com metade truncada | P-101-02; rolagem de Criatura já usa bônus fixo corretamente |
| Guia: sobra de turnos no fim | P-101-03: código e teste existentes já fazem isso |
| Guia: A Estátua, fraqueza26 e Esmagamento3D12+4/DT17 | P-101-03; referências, sem migração cega de fichas |
| Guia: exemplo de porte3×3 passa a Enorme (com grafia “Enomes”) | Tabela já é Enorme3×3/Gigante5×5; detalhe editorial para revisão autoral, sem alterar tabela |
| Demais mudanças: nomenclatura, paginação, títulos, ênfase e exemplos narrativos | Sem cálculo novo por si só; P-102 para referências correntes pertinentes |

## Decisões ainda para revisão

- **Crítico:** não inferir pela fórmula se o teste terá resultado posterior. Conferir
  aplicação de +2 versus crítico do dano/cura no fluxo escolhido, inclusive Competência,
  antes de alterar o motor novamente. A API genérica não conhece intenção futura.
- **Ocultação:** autor decidiu rolagens sempre privadas. Definir apresentação do item
  compatível com isso; alternância pública do análogo não está automaticamente autorizada.
- **NPC equipamento/ataques:** definir o recorte de produto após a investigação, sem
  importar classe/progressão de Jogador para NPC.
- **Exemplos/editorial do autor:** Fraco+6 versus fórmula+5, Social base2→zero versus
  “três pontos”, versão interna e grafia de Porte. Preparar proposta para o autor;
  não alterar os livros. P-093 arredondamento continua ACEITO por decisão anterior.

## Critérios de Aceite

- Cada alteração mecânica localizada tem task, evidência de compatibilidade existente
  ou decisão pendente explícita. Nenhuma mudança de livro é chamada de correção automática.
- P-099 descartada e excluída da fila executável; P-095/P-096 independentes de regras do jogo.
- Tasks têm objetivo, entregáveis, critérios, fora de escopo e dependências, com gates
  adequados à implementação futura; links conferidos.
- Nenhuma nova mudança funcional, teste, banco ou publicação nesta rodada.
  O versionamento da preparação documental foi expressamente autorizado pelo autor.
- Ao executar futuramente, não repetir gate amplo sem mudança; UI exige análogo,
  primitivo completo e inspeção pessoal nos quatro viewports definidos nas tasks.

## Fora de Escopo

- Implementar agora, commitar código fora desta preparação, alterar fontes ou reescrever specs em done.
- Tratar todos os problemas históricos do repositório como escopo desta publicação.
- Deduzir rolagens posteriores, gerar automático equipamento/habilidade ou refazer
  Cadência/rolagem de Criatura que já correspondem ao documento.

## Dependências

- Sistema v4.1.3/Guia v4.2.0; [revisão detalhada](../../reviews/m4-19-revisao-guia-v4.2.0.md).
- Esclarecimentos do autor nesta conversa; revisão conjunta antes de executar correções.
