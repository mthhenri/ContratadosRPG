# m3-07-frontend-ficha-lista-visualizacao.spec.md

> Task 7/9 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> Alvo de fidelidade desktop: `docs/design/examples/ficha-de-jogador.html`.

## Objetivo

**Lista de fichas da campanha** (respeitando permissões) e **visualização read-only** de uma
ficha — para quem tem acesso concedido mas não edita —, mais a **UI de concessão/revogação
de acesso** (`m3-04`). Fecha o consumo do CRUD de ficha na UI, exceto o tempo real.

## Entregáveis

1. **Lista de fichas da campanha** — dono vê a própria, mestre vê todas, outro membro só as
   concedidas. O backend (§14) já filtra; o front **apenas apresenta** e não duplica regra.
   Indicação de dono/tipo por chip.
2. **Visualização read-only** de uma ficha com stats derivados via `shared/regras` (mesma
   exibição da edição da `m3-06`, sem edição) para quem tem acesso mas não é dono/mestre.
3. **UI de concessão/revogação de acesso** (`m3-04`) — dono/mestre concede visualização a
   outro membro e revoga; a autoridade é sempre o backend (a UI reflete, não decide).
4. Standalone **lazy**, estado em **Signals**, `.scss`/BEM com os tokens do tema.

## Critérios de Aceite

- A lista respeita permissões (validável com dono / mestre / terceiro).
- Terceiro vê a ficha **só após** o acesso concedido; a revogação a oculta de novo.
- Padrões do front respeitados (standalone, Signals, `.scss`/BEM, tokens).

## Fora de Escopo

- Tempo real / tela do mestre ao vivo (`m3-08`).
- Criação/edição da própria ficha (`m3-06`).
- Refinamento mobile dedicado (`m3-09`).

## Dependências

- `m3-06` (`FichaService` e o componente de exibição da ficha, reusado read-only).
- `m3-03` (listar/recuperar) e `m3-04` (endpoints de acesso).
