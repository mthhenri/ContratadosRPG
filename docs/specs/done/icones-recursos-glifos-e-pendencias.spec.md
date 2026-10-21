# Ícones de recursos — glifos e pendências

> **Concluída em 2026-10-20** — as ações genéricas foram votadas ([decisões](icones-recursos-glifos-e-pendencias/decisoes.md)) e a adoção segue em [icones-acoes-genericas-adocao](../backlog/icones-acoes-genericas-adocao.spec.md).

> Continuação da [rodada arquivada](../done/icones-recursos-sistema.spec.md).
> O autor decidiu em 09/10/2026 manter o trabalho restante aberto no backlog.

## Objetivo

Levantar glifos de texto usados como ícones e conceitos do sistema ainda sem ícone,
preservando as decisões e os limites de verificação da rodada anterior.

## Entregáveis

1. Inventário dos glifos em templates/SCSS, com arquivo, uso e distinção entre convenção
   do texto do jogo e ícone de interface. Levantamento dos conceitos sem ícone a partir
   de `docs/core/` e das telas atuais; não inventar conceitos nem substituir texto autoral.
2. Propostas para decisão do autor, no formato da prancha já usada, sem repetir os 21
   itens votados e implementados. A implementação do aprovado recebe task própria.
3. Resolver com o autor a divergência de tooltip por extenso: o contrato original pede
   "3 de Energia"/"12 de Vida", enquanto os consumidores usam "Energia"/"Vida" junto
   do valor visível. Manter a divergência aberta até decisão explícita.
4. Completar ou recortar os limites registrados de tema claro e toque real nos pontos novos.
   As correções de Esquadrão/Fragmentos foram conferidas para o commit do conjunto em
   09/10/2026, conforme o [fecho](../done/icones-recursos-sistema/fecho-documental.md).

## Critérios de Aceite

Inventário rastreável, decisões explícitas do autor e pendências sem perda de cobertura.
Não declarar substituição de glifos ou aceite de tooltip somente por produzir uma prancha.
Os limites e as três correções já observadas estão no
[relatório anterior](../done/icones-recursos-sistema/entrega-2-verificacao.md).

Se houver alteração de UI, cumprir `design-fidelity` e `verify`: análogo aprovado antes
de editar, primitivos canônicos e aplicação real em 1920×1080, 1366×768, 960×1080 e
360×800, nos estados pertinentes. Testes/build/lint proporcionais e `repo:verificar`.

## Fora de Escopo

Reexecutar a adoção já entregue, redesenhar os ícones votados, alterar regras/cálculos,
implementar conceitos ou ampliar primitivos sem decisão do autor.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`, `docs/core/`,
`docs/specs/done/icones-recursos-sistema/` e
`docs/specs/done/icones-dano-habilidade-fragmento-reacao.spec.md`.

## Decisões do autor — 2026-10-18

- Maestria B — Atributo coroado.
- Crítico A — Dado excepcional, com estrelinhas no lugar dos riscos.
- Energia em Utilizar: aprovado o ícone `energia` existente.
- Tooltip T3 — recorte misto aprovado: somente nome em barras, fichas, cards e
  resumos (Vida/Energia/Defesa); por extenso somente nos custos avulsos de Energia
  do inventário e das habilidades de NPC (“3 de Energia”). Leitor de regras fora.
- Aprovações geram task própria e **não autorizam implementação nesta rodada**.
  Criadas no backlog `icones-maestria-adocao`, `icones-critico-adocao` e
  `icones-energia-utilizar` e `icones-tooltips-recursos-t3`; sem trocas no produto
  nesta etapa.
- Ações genéricas continuam aguardando votos/alcance. Registro completo e refino
  no [anexo de decisões](icones-recursos-glifos-e-pendencias/decisoes.md).

## Execução posterior autorizada — 18/10/2026

Autor autorizou executar as quatro specs próprias. Maestria, Crítico, Energia em Utilizar e T3 concluídas, com specs e verificação em done. Ações genéricas votadas em 20/10/2026; adoção em task própria. A aprovação inicial dos desenhos não foi usada como autorização implícita.
