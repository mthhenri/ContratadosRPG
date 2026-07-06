# m1-13-sistema-temas-runtime.spec.md

> Task 13/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Entregar o **sistema de troca de tema em runtime** (entregável 4 da milestone e item adiado
do M1 em SYSTEM.SPEC §15): presets de cor, tema claro/escuro e color picker custom com
**trava de contraste**, reconstruído sobre o sistema de presets/CSS vars do PrimeNG 21 e os
tokens de `docs/design/tema/`.

**Antes de qualquer UI, ler `docs/design/DESIGN.md`.** O dark base + IBM Plex são a
**identidade fixa**; só o `--accent` (e claro/escuro) é trocável — a definição da identidade
já está feita, esta task cobre apenas a troca em runtime.

## Entregáveis

1. **Presets de cor** aplicáveis em runtime sobre o `ContencaoPreset` do PrimeNG, mapeando os
   tokens do tema (`setAccent`/`setBase`, `applyTheme` do site antigo).
2. **Tema claro/escuro** alternável em runtime.
3. **Color picker custom** com **trava de contraste** (`setCustomAccent`, `contrastRatio`,
   `relativeLuminance`, `updateSwatchLocks`, `fallbackAccentForBase`, `SIMILAR_THRESHOLD`) —
   impede accent com contraste insuficiente contra o fundo.
4. **Painel de configurações** (`openSettings`) e **persistência** da escolha (`saveTheme`,
   ex.: localStorage), restaurada no boot.

## Critérios de Aceite

- Troca de preset/accent/claro-escuro reflete em runtime em todas as páginas da calculadora.
- A trava de contraste bloqueia combinações ilegíveis (paridade com o site antigo).
- Identidade fixa preservada (dark base + IBM Plex); tudo via tokens — sem hex solto
  (proibição #29).

## Fora de Escopo

- Redefinição da identidade visual (já definida em `docs/design/`).
- Temas por campanha/usuário no backend (fora do M1).

## Dependências

- `m1-06-frontend-calculadora-base.spec.md` (shell da calculadora para aplicar/testar).
  Recomendado após as páginas (m1-07..m1-10) para validar o contraste sobre UI real.
