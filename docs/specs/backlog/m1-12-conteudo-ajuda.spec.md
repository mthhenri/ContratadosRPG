# m1-12-conteudo-ajuda.spec.md

> Task 12/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Entregar o conteúdo de ajuda por aba — modais de ajuda em paridade com o site antigo
(`HELP_CONTENT`, `openHelp`/`closeHelp`) — como componente reutilizável nas 6 páginas
(parte do entregável 4 da milestone).

**Antes de qualquer UI, ler `docs/design/DESIGN.md`** e reusar os padrões BEM do tema.

## Entregáveis

1. Componente de **modal de ajuda reutilizável** consumido pelas 6 páginas, com o gatilho
   (ícone/botão de ajuda) por aba.
2. **Conteúdo de ajuda** migrado de `HELP_CONTENT` (uma entrada por aba: agente, dt,
   novo-agente, patente, descanso, compras), com paridade de texto.
3. Consumo dos tokens e padrões BEM do tema; sem `style=""`/hex solto.

## Critérios de Aceite

- Cada aba abre seu modal de ajuda com o conteúdo correspondente ao do site antigo.
- Um único componente de ajuda reutilizado nas 6 páginas (sem duplicação por aba).
- Sem NgModule/`.css`/`style=""`/hex solto.

## Fora de Escopo

- Regras de jogo; troca de tema em runtime (m1-13).

## Dependências

- `m1-06-frontend-calculadora-base.spec.md` e as páginas que hospedam a ajuda
  (`m1-07`, `m1-08`, `m1-09`, `m1-10`).
