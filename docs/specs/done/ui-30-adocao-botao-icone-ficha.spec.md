# ui-30-adocao-botao-icone-ficha.spec.md

> Task 3/5 da série `ui-28`…`ui-32` (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`),
> origem `P-048`. Depende de `ui-28`. Maior task da série — considere dividir em sub-tasks por
> componente ao abrir, se o diff ficar difícil de revisar de uma vez.

## Objetivo

Todo controle clicável do lado "ficha" de `frontend/src/app/modules/ficha/**` (exclui o lado
Criatura/NPC, coberto por `ui-31`) que reimplementa hover/foco/tamanho na mão passa a usar
`app-botao`/`app-botao-icone`, incluindo o tamanho `mini` (de `ui-28`) para os muitos padrões
"mini-btn" deste módulo.

## Entregáveis

1. `cartao-ficha-acervo.component.html` — `.acervo__menu-botao` (`app-botao-icone`).
2. `acervo.page.html` — `.acervo__menu-item` (tem texto, `app-botao`).
3. `ficha-combos.component.html` — `.ficha-combos__mini-btn` ×8 (`app-botao-icone` `mini`);
   `.ficha-combos__btn`, `.ficha-combos__novo`, `.ficha-combos__add-passo` (têm texto, `app-botao`).
4. `ficha-habilidade-seletor.component.html` — `.seletor__fechar`, `.seletor__opcao-add`
   (`app-botao-icone`); `.seletor__opcao-ver-mais`, `.seletor__opcao-remover` (têm texto,
   `app-botao`).
5. `ficha-habilidades.component.html` — `.habilidades__limpar-filtro`, `.habilidades__acao` ×3,
   `.habilidades__dialog-fechar` (`app-botao-icone`); `.habilidades__add` ×2,
   `.habilidades__utilizar`, `.habilidades__salvar` ×2, `.habilidades__cancelar` ×2 (`app-botao`).
6. `ficha-inventario.component.html` — `.ficha-inv__item-apelido-lapis` ×2,
   `.ficha-inv__efeito-remover` (`app-botao-icone`); `.ficha-inv__mandar-base`,
   `.ficha-inv__porte` ×2, `.ficha-inv__modificar`, `.ficha-inv__item-rolar`,
   `.ficha-inv__efeito-adicionar` (`app-botao`).
7. `ficha-rolagens.component.html` — `.ficha-rol__mini-btn` ×7 (`app-botao-icone` `mini`);
   `.ficha-rol__btn--icone` ×2 (`app-botao-icone`); `.ficha-rol__novo`, `.ficha-rol__add-passo`
   (`app-botao`).
8. `ficha-sanidade.component.html` — `.sanidade__add` ×3, `.sanidade__acao` ×6
   (`app-botao-icone`); `.sanidade__salvar` ×6, `.sanidade__cancelar` ×6 (`app-botao`).
9. `ficha-visualizacao.component.html` — `.ficha-hud__vitais`, `.ficha-ident__avatar-enquadrar`,
   `.ficha-ident__avatar-remover`, `.ficha-ident__chip-lapis` ×3, `.ficha-mini__info`,
   `.ficha-barra__receber-dano`, `.ficha-cartao__lapis` ×3, `.ficha-atributo__rolar`,
   `.ficha-mini__rolar` ×2, `.ficha-extras__mini-btn` ×3 (`app-botao-icone`, `mini` onde o ícone é
   inline pequeno sem borda hoje); `.ficha-ident__visibilidade`, `.ficha-condicoes__item`
   (`app-botao`).
10. `guia-equipamento-loja.component.html` — `.loja__item-add`, `.loja__carrinho-item-remover`
    (`app-botao-icone`).
11. `guia-formula.component.html` — `.guia-gatilho` (tem texto, `app-botao`); `.guia-btn`
    (`app-botao`).
12. `pagina-caderno/caderno-flutuante.component.html` — `.caderno__recarregar`, `.caderno__voltar`
    (`app-botao`). **Excluído**: `.caderno__gatilho` usa `_utilitario-flutuante.scss` (ver nota em
    `ui-28`).
13. CSS local das classes migradas remove hover/foco/borda/transição duplicados; mantém só
    geometria/posicionamento.

## Critérios de Aceite

1. `grep -rn "<button\|<a " frontend/src/app/modules/ficha --include=*.html | grep -v "app-botao"`
   não retorna nenhum controle listado nos Entregáveis 1–12 (sobra `criatura-*`, coberto por
   `ui-31`, e os carve-outs documentados no `INDEX`: stepper, chip, valor editável/Grupo C, select
   customizado/Grupo D).
2. `npm run test --workspace=frontend` sem regressão nas specs tocadas.
3. `npm run lint --workspace=frontend` sem novos erros.
4. Gate visual (`verify` + `design-fidelity`) em `1920×1080`/`360×800`: abrir uma ficha real em
   `/fichas/:id`, o guia de criação (`/painel/:campanhaId/ficha`), o acervo (`/fichas`) e o caderno
   flutuante. Análogo: resultado de `ui-28`.

## Fora de Escopo

Lado Criatura/NPC (`ui-31`), demais módulos, Grupos C/D — ver `INDEX`.

## Dependências

`ui-28`.
