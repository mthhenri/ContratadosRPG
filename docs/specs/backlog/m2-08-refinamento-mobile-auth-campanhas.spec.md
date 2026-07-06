# m2-08-refinamento-mobile-auth-campanhas.spec.md

> Task 8/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Refinamento de UI/UX **mobile** das telas novas do M2 (auth + campanha), seguindo o mesmo
padrão responsivo por tokens estabelecido em `m1-15-refinamento-mobile-calculadora.spec.md` e a
identidade "Terminal de Contenção" (`docs/design/`). Sem tocar em regra de jogo nem em regra de
negócio — só apresentação.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o override
> de tokens de densidade (`--pad-card`/`--gap-grid`) já introduzidos na m1-15. Nada de largura
> mágica por arquivo nem hex/fonte/raio solto (proibição #29).

## Entregáveis

1. **Telas de auth** (login/registro) e **de campanha** (listar, criar, entrar por código,
   detalhe/membros) otimizadas para tela pequena (~360px): sem scroll horizontal do body,
   densidade ajustada por override de token, formulários e listas confortáveis no polegar.
2. **Alvos de toque** ≥ 44px nos controles interativos das telas novas (botões, campos, ações
   de campanha/regenerar), reusando `$alvo-toque` da m1-15.
3. **Sem scroll horizontal** do body em ~360px; conteúdo largo (se houver) rola no próprio
   container (`overflow-x: auto`), não no body.
4. Identidade preservada (dark base + IBM Plex + tokens); nenhuma mudança de DOM/TS que altere
   comportamento — idealmente só SCSS (como na m1-15), mantendo os testes verdes.

## Critérios de Aceite

- Todas as telas novas do M2 (auth + campanha) usáveis no mobile (~360px) **sem scroll
  horizontal** (critério de aceite do milestone).
- Alvos de toque confortáveis (≥ 44px); densidade coerente com o padrão da m1-15.
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.

## Fora de Escopo

- Novas features ou telas além das entregues em m2-06/m2-07.
- Qualquer mudança de regra de negócio, permissão ou de domínio.

## Dependências

- `m2-06` e `m2-07` (as telas a refinar já existem).
