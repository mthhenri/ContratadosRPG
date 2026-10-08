# p-102-referencias-documentos-vigentes.spec.md

> Task documental de PROBLEMS P-102. Execução autorizada pelo autor em 2026-10-06,
> após o commit integrado de P-101/01/02/03.

## Objetivo

Alinhar os ponteiros operacionais aos livros atuais, mantendo citações históricas das
versões anteriores e sem alterar as regras autorais como efeito de uma troca de nome.

## Entregáveis

1. Conferir cada referência antiga em README, SCHEMA, docs/design, specs ativas/backlog
   e comentários de código corrente. Trocar ponteiro que afirma “fonte atual” por
   Sistema v4.1.3/Guia v4.2.0, após confirmar correspondência da seção.
   Exemplos já localizados: README 25–26; SCHEMA 320/487/497; FICHA-NPC 6;
   milestone m4 ativo e montador experimental ativo. Não fazer substituição global.
2. Preservar HISTORY, reviews datados e specs em done como registro de sua versão.
   Comentário com fórmula superada deve ser corrigido pela task mecânica correspondente,
   não receber apenas um nome de arquivo novo para parecer validado.
3. Conferir links operacionais e pipeline atual dos PDFs sem mudar novamente os arquivos
   publicados já alinhados. Se encontrar defeito real de publicação, registrar separadamente.
4. Separar correções editoriais autorais (versão interna, exemplos e P-093) dos ponteiros
   do repositório. Preservar estado ACEITO de P-093 e submeter texto/diff ao autor antes
   de alterar docs/core; mudança de ponteiro não é autorização de alterar o livro.

## Critérios de Aceite

- Fontes operacionais apontam arquivos existentes e seções pertinentes.
- Referências históricas preservadas; nenhum arquivo em done reescrito.
- SCHEMA/documento visual não declara conformidade com Competências/DT novas antes
  das tasks que alteram contrato/cálculo/UI; registrar dependência quando necessário.
- Diff e links conferidos, AGENTS/CLAUDE e skills espelhadas idênticos se tocados.
  Sem build/gate visual por troca exclusiva de comentários/links.

## Fora de Escopo

- Fontes autorais, regras/código funcional, publicação de versão,
  P-098 de ficha oculta (task própria) e reescrita de todo o histórico.

## Dependências

- Sistema v4.1.3 e Guia v4.2.0 recebidos; tasks mecânicas para trechos com regra alterada.

## Fecho — 2026-10-06

Concluída após autorização do autor. Inventário de 299 ocorrências/173 arquivos,
ponteiros correntes alinhados após comparação dos livros e verificação das seções;
contexto operacional complementar também conferido. Histórico, reviews datados,
specs anteriores em done e fontes autorais preservados. Citação D4 identificada como
histórica; exceção de Patente/Nível no preset explicitada como decisão legada,
sem impor à regra corrente ou inferir rolagem posterior.

Schema/design/milestone distinguem adequações P-100/P-101 concluídas das pendências
de Competências/testes m4-19 e investigação Ataques/Equipamentos NPC. Exemplo de
ataque no schema usa os campos já implementados, sem alterar DTO ou ficha existente.
OpenAPI regenerado oficialmente: operações e schemas anteriores estruturalmente
iguais; quatro schemas de DTOs já existentes na P-101 incluídos pela geração.

Provas: 160 arquivos TS com emissão funcional igual (um título de suíte alinhado),
dois templates/dois SCSS iguais fora de comentários; 3 testes OpenAPI e 77 de contas
passaram. PDFs existentes idênticos por SHA-256 em fonte/public/saída; pipeline,
links e diff conferidos. Sem novo build/lint amplo/gate visual pelo recorte documental
com código/UI preservados. P-093 ACEITO e editorial autoral intactos.

[Relatório e evidências](p-102-referencias-documentos-vigentes/p-102-verificacao.md). Resíduos temporários
limpos; proposta M10 preservada. Nenhuma pendência técnica desta tarefa; P-102 sem
commit próprio nesta execução. P-101 e as três filhas já versionadas em `767b47bf`.
