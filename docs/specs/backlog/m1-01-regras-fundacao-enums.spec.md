# m1-01-regras-fundacao-enums.spec.md

> Task 1/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Estabelecer a fundação do motor de regras no `shared/` **antes de qualquer fórmula de
domínio ou UI**: harness de teste Jest para o workspace, estrutura de `regras/`, os enums
de conteúdo de jogo e as tabelas de dados tipadas compartilhadas entre os domínios.

## Entregáveis

1. **Jest configurado no workspace `shared/`**: `npm run test --workspace=shared` roda os
   testes de `regras/` (o `test --workspaces --if-present` agregado da CI da m0-06 passa a
   exercitar o shared).
2. **Estrutura `shared/src/regras/`** conforme SYSTEM.SPEC §3: pastas `agente/`, `dt/`,
   `novo-agente/`, `patente/`, `descanso/`, `compras/`, `dados/` com barrels — vazias de
   fórmula (nascem nas tasks seguintes).
3. **Enums de jogo** em `shared/src/enums/` (entregável 2 da milestone): `ClasseEnum`,
   `PatenteEnum`, categorias de item do catálogo, tipos/qualidade de descanso e demais
   constantes de conteúdo do jogo que o site antigo trata como enum. String enum, valor =
   nome, SCREAMING_SNAKE_CASE (§5). São enums de conteúdo de JSONB → **sem tabela `tipo_*`**
   (§10.3).
4. **Tabelas de dados tipadas compartilhadas** em `regras/dados/`: `dadosAgente`,
   `dadosCivil` e `PATENTES`, migradas de `contratados-calculadora/src/script.js` como dados
   tipados, conferidas contra `docs/core/sistema-v4.1.0.md`.
5. **Uma prova de harness**: um teste trivial sobre uma tabela de dados (ex.: consulta em
   `PATENTES`) só para validar o pipeline de teste ponta a ponta.

## Critérios de Aceite

- `npm run test --workspace=shared` verde; `regras/` sem nenhuma dependência externa — só
  funções puras e dados tipados (§6.6, proibições #26).
- Enums e dados conferem com `docs/core/sistema-v4.1.0.md` (o documento vence o código —
  proibição #27); qualquer divergência com o site antigo registrada em comentário/CONTEXT.
- Nenhuma UI nesta task.

## Fora de Escopo

- Fórmulas de domínio (agente, dt, novo-agente, patente, descanso, compras) — tasks m1-02+.
- Qualquer componente Angular ou página.

## Dependências

- M0 concluído (workspace `shared/` e CI de testes já existem).
