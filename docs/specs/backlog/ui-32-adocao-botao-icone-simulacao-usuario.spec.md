# ui-32-adocao-botao-icone-simulacao-usuario.spec.md

> Task 5/5 da série `ui-28`…`ui-32` (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`),
> origem `P-048`. Depende de `ui-28`. Menor volume da série.

## Objetivo

Todo controle clicável de `frontend/src/app/modules/simulacao/**` e `frontend/src/app/modules/usuario/**`
que reimplementa hover/foco/tamanho na mão passa a usar `app-botao`/`app-botao-icone`.

## Entregáveis

1. `compras.page.html` — `.compras-efeito__remover` (`app-botao-icone`); `.compras-limpar` ×6,
   `.compras-modificar`, `.compras-porte`, `.compras-efeito__adicionar` (`app-botao`, apesar do
   nome de classe único cobrindo vários botões — separar por conteúdo real do template).
2. `patente.page.html` — `.calc-stat__info` (`app-botao-icone`).
3. `gestao.page.html` — `.gestao__limpar-filtros`, `.gestao__tipo-confirmar`,
   `.gestao__tipo-cancelar` (`app-botao-icone`); `.gestao__tipo` (tem texto, `app-botao`).
4. CSS local das classes migradas remove hover/foco/borda/transição duplicados; mantém só
   geometria/posicionamento.

## Critérios de Aceite

1. `grep -rn "<button\|<a " frontend/src/app/modules/simulacao frontend/src/app/modules/usuario --include=*.html | grep -v "app-botao"`
   não retorna nenhum controle listado no Entregável 1–3.
2. `npm run test --workspace=frontend` sem regressão nas specs tocadas.
3. `npm run lint --workspace=frontend` sem novos erros.
4. Gate visual (`verify` + `design-fidelity`) em `1920×1080`/`360×800`: Compras, Patente e Gestão
   de usuários (admin). Análogo: resultado de `ui-28`.

## Fora de Escopo

Demais módulos, Grupos C/D — ver `INDEX`.

## Dependências

`ui-28`.
