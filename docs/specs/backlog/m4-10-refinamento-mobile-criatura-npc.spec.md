# m4-10-refinamento-mobile-criatura-npc.spec.md

> Task 10/10 do milestone `m4-ficha-criatura-npc.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o
> padrão de densidade por tokens já validado em `m1-15`/`m3-09`. Nada de largura mágica
> por arquivo nem hex/fonte/raio solto (proibição #29).

## Objetivo

Refinamento de UI/UX **mobile** dos dois assistentes de criação (criatura e NPC,
multi-etapas) e da listagem/revelação no painel do mestre (`m4-04`/`m4-08`/`m4-09`) —
usáveis em ~360px, sem scroll horizontal, com alvos de toque adequados e navegação de
etapas confortável no polegar. Só apresentação — sem tocar em regra de jogo ou de negócio.
Task explicitamente reservada para o fim do milestone (escopo acordado em
`m4-ficha-criatura-npc.spec.md`).

## Entregáveis

1. **Os dois assistentes de criação** usáveis em ~360px sem scroll horizontal: trilha de
   etapas adaptada a mobile (mesmo padrão do guia de criação de ficha de jogador —
   trilha vira barra de progresso no topo, resumo operacional vira bottom sheet, se
   aplicável ao volume de conteúdo de cada roteiro).
2. **Listagem/revelação do painel do mestre** (`m4-09`) usável em ~360px: cards/linhas que
   refluem, sem rolagem horizontal.
3. **Alvos de toque ≥ 44px** (`$alvo-toque`) em todos os controles interativos dos três
   fluxos.
4. **Verificação responsiva registrada** (360/390/430px, mais 1920×1080 para confirmar que
   nada regrediu no desktop), na linha do gate obrigatório de UI (`AGENTS.md`) e de
   `docs/PARIDADE-M1.md` §6.

## Critérios de Aceite

- Assistentes de criação e listagem do mestre usáveis no mobile (~360px) sem scroll
  horizontal (critério de aceite do milestone).
- Alvos de toque confortáveis; densidade coerente com o padrão já estabelecido no projeto.
- `lint`/`test`/`build` do frontend verdes; identidade "Terminal de Contenção" preservada.

## Fora de Escopo

- Novas features ou telas além das entregues em `m4-04`/`m4-08`/`m4-09`.
- Qualquer mudança de regra de negócio, permissão ou de domínio.
- Rework visual desktop.

## Dependências

- `m4-04`, `m4-08`, `m4-09` (telas base a refinar).
- `m1-15`/`m3-09` (padrão responsivo por tokens já validado no projeto).
