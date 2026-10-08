# Specs e anexos de tarefa

Política canônica: [`SYSTEM.SPEC.md` §3.1](../SYSTEM.SPEC.md#31-documentação-de-tarefa-e-artefatos-de-execução).
Ordem de trabalho: [skill `task-flow`](../../.agents/skills/task-flow/SKILL.md).

```text
docs/specs/
  backlog/<tarefa>.spec.md
  active/<tarefa>.spec.md
  active/<tarefa>/plano.md
  active/<tarefa>/design.md
  active/<tarefa>/verificacao.md
  done/<tarefa>.spec.md
  done/<tarefa>/...             anexos movidos junto da spec
.artifacts/<tarefa>/...         capturas e saídas locais, ignoradas
```

Os nomes legados dos anexos foram preservados para facilitar a identificação;
novos anexos podem usar nomes simples como `plano.md` ou `verificacao.md`.
Uma tarefa pode ter vários anexos e apenas uma spec dona. Avaliação parcial
continua aberta; registro retrospectivo não recertifica o produto.

Antes de fechar: `npm run repo:test` e `npm run repo:verificar`.
Depois de preparar um commit: `npm run repo:verificar -- --staged`.
O CI usa esse último modo para conferir o conteúdo efetivamente versionado,
inclusive os espelhos de agentes e todos os auxiliares das skills.

Inventário e mapa da realocação de 08/10/2026 ficam nos anexos de
`organizacao-documentacao-e-artefatos`, no estado vigente dessa tarefa.
