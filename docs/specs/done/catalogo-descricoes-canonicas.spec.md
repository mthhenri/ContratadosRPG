# catálogo-descrições-canônicas.spec.md

> Task avulsa: corrige descrições simplificadas identificadas na auditoria do catálogo.

## Objetivo

Alinhar as descrições selecionadas de itens e modificações ao texto e às condições
relevantes de `docs/core/sistema-v4.1.0.md`, para que Compras e Inventário não
induzam jogadores a uma leitura incompleta das regras.

## Entregáveis

1. Atualizar no catálogo compartilhado as descrições de Energético, Energético
   Concentrado, Bolso de Corpo, Pochete, Mochila Médica, Estabilizador de Lesão e
   Anestesia.
2. Atualizar as descrições de Espaço Reservado, Posicionável e Instável.
3. Cobrir os textos corrigidos por teste de regressão do catálogo.

## Critérios de Aceite

1. O teste focado de `shared/src/regras/compras/compras.spec.ts` passa e verifica
   cada condição textual corrigida.
2. A suíte e o lint do workspace `shared` passam.
3. O diff não altera mecânicas, cálculos, nem descrições fora da lista acima.

## Fora de Escopo

- Revisar as demais descrições resumidas do catálogo.
- Alterar comportamento de sub-inventários, itens, modificações ou as telas que
  consomem o catálogo.

## Dependências

- `docs/core/sistema-v4.1.0.md`, tabelas de Armazenamento, Itens Operacionais,
  Itens Medicinais e Modificações.
