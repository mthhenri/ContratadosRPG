# m3-09-refinamento-mobile-ficha.spec.md

> Task 9/9 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o
> override de tokens de densidade (`--pad-card`/`--gap-grid`) da `m1-15`. Nada de largura
> mágica por arquivo nem hex/fonte/raio solto (proibição #29).

## Objetivo

Refinamento de UI/UX **mobile** das telas de ficha — o **ecrã mais denso do sistema**:
criação/edição, ficha completa com stats derivados e a lista/painel do mestre precisam ser
confortáveis em ~360px. Segue o padrão responsivo por tokens da
`m1-15-refinamento-mobile-calculadora.spec.md` e a identidade "Terminal de Contenção"
(`docs/design/`). Só apresentação — sem tocar em regra de jogo nem de negócio.

## Entregáveis

1. **Criação/edição, visualização completa e lista/painel do mestre** usáveis em ~360px
   **sem scroll horizontal do body**: densidade via override de `--pad-card`/`--gap-grid`,
   grades que refluem (`auto-fit`/`auto-fill minmax`), reuso de `_breakpoints.scss`.
2. **Alvos de toque ≥ 44px** (`$alvo-toque`) nos controles interativos: steppers, botões
   primário/secundário, chips, ações de conceder/revogar acesso, navegação entre telas.
3. **Seções colapsáveis** onde fizer sentido — a ficha é densa (atributos, habilidades,
   inventário, estado) — para reduzir a rolagem vertical no polegar.
4. Idealmente **SCSS-only** (como na m1-15); se um ajuste exigir marcação (ex.: container
   rolável, disclosure de seção), manter mínimo e **sem tocar em lógica**; testes verdes.
5. **Verificação responsiva registrada** (360/390/430px), na linha da §6 de
   `docs/PARIDADE-M1.md`.

## Critérios de Aceite

- Todas as telas de ficha (criação/edição/visualização e lista/painel do mestre) usáveis no
  mobile (~360px) **sem scroll horizontal** (critério de aceite do milestone).
- Alvos de toque confortáveis (≥ 44px); densidade coerente com o padrão da m1-15.
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.

## Fora de Escopo

- Novas features ou telas além das entregues em `m3-06`/`m3-07`/`m3-08`.
- Qualquer mudança de regra de negócio, permissão ou de domínio.
- Rework visual desktop (a estilização é a das tasks de frontend — aqui só o comportamento
  responsivo).

## Dependências

- `m3-06` / `m3-07` / `m3-08` (as telas base a refinar).
- `m1-15` (padrão responsivo por tokens) e `docs/design/examples/ficha-de-jogador.html`
  (alvo desktop).
