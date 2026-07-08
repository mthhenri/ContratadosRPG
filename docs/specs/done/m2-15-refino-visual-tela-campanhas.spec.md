# m2-15-refino-visual-tela-campanhas.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-09) — task `m2-15`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

**Refino visual** das telas de campanha (lista + detalhe) para aproximá-las do layout e do
estilo dos protótipos `docs/design/examples/campanhas.html` e
`docs/design/examples/lobby-de-campanha.html` — **só apresentação**, sem novas seções, sem
dados novos e sem tocar em regra de negócio.

> **Escopo (decisão do autor): só refino visual.** Conteúdo decorativo dos protótipos **sem
> dado real no schema** (status ao vivo/agendada/pausada, briefing, log de atividade,
> indicador online) fica **de fora** — como já registrado no CONTEXT.md ao entregar a m2-09.

## Entregáveis

1. Aproximar o **layout e o estilo** da **lista** (`/painel`) e do **detalhe** (`/painel/:id`)
   aos protótipos: hierarquia visual, espaçamento, cabeçalhos de seção, chips, avatares —
   **consumindo só os tokens do tema** (proibição #29), copiando os blocos BEM de
   `docs/design/tema/_componentes.scss` quando necessário.
2. **Acomodar visualmente** as ações introduzidas nas `m2-12`/`m2-13` (editar/excluir campanha,
   remover jogador, transferir mestre) no lugar certo do layout — **sem mudar comportamento**.
3. Idealmente **SCSS-only** (como m1-15/m2-08); se um ajuste exigir marcação, mantê-la mínima
   e **sem tocar em lógica/TS**; testes verdes.
4. **Não regredir** a responsividade mobile da m2-08 (~360px, sem scroll horizontal, alvos de
   toque ≥ 44px).

## Critérios de Aceite

- Lista e detalhe visualmente mais próximos dos protótipos, usando só tokens do tema.
- **Nenhum** dado/campo/seção nova sem backing no schema; nenhuma feature funcional nova.
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.
- Responsividade mobile (m2-08) preservada.

## Fora de Escopo

- Qualquer dado novo, campo novo ou mudança de schema/backend.
- Features funcionais (edição/exclusão/gestão de membros são as `m2-12`/`m2-13`).
- Conteúdo decorativo dos protótipos sem dado real no schema.

## Dependências

- `m2-12` / `m2-13` — idealmente **depois** delas, para estilizar a tela com as ações já no
  lugar (evita retrabalho).
- `m2-08` (base responsiva mobile a preservar) e os protótipos em `docs/design/examples/`.
