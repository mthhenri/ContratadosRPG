# ui-31-adocao-botao-icone-criatura.spec.md

> Task 4/5 da série `ui-28`…`ui-32` (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`),
> origem `P-048`. Depende de `ui-28`.

## Objetivo

Todo controle clicável do lado Criatura/NPC de `frontend/src/app/modules/ficha/**` (componentes
`criatura-*` e as páginas de criação/visualização de agente/criatura) que reimplementa hover/foco/
tamanho na mão passa a usar `app-botao`/`app-botao-icone`.

## Entregáveis

1. `criatura-ataque-lista.component.html` — `.ataque-lista__cabecalho-acao` ×2,
   `.ataque-lista__acao` ×2 (`app-botao-icone`); `.ataque-lista__rolar` ×3 (tem texto, `app-botao`).
2. `criatura-habilidade-lista.component.html` — `.habilidade-lista__cabecalho-acao` ×2,
   `.habilidade-lista__acao` ×2 (`app-botao-icone`).
3. `criatura-resistencia-lista.component.html` — `.resistencia-lista__alternar-edicao`,
   `.resistencia-lista__adicionar`, `.resistencia-lista__acao` ×4 (`app-botao-icone`).
4. `criatura-visualizacao.component.html` — `.criatura__avatar-enquadrar`,
   `.criatura__avatar-remover`, `.criatura__receber-dano`, `.criatura__atributo-rolar`,
   `.criatura__info-acao` ×2 (`app-botao-icone`, `mini` onde aplicável);
   `.ficha-rolagem-oculta` (tem texto, `app-botao`).
5. `guia-equipamento-loja.component.html` — ver `ui-30` Entregável 10 (arquivo compartilhado entre
   os dois lados; migrar junto se ainda não migrado).
6. `criar.page.html` / `criar-criatura.page.html` — `.guia__sair` (`app-botao-icone`);
   `.guia__formacao-remover` (`app-botao-icone`); `.guia__resumo-fechar` (`app-botao-icone`);
   `.guia__resumo-abrir`, `.guia__resumo-toggle` (`app-botao`).
7. `visualizar.page.html` / `visualizar-criatura.page.html` — `.ficha-pagina__voltar`
   (`<a routerLink>`, `app-botao-icone`); `.ficha-pagina__menu-botao` (`app-botao-icone`);
   `.ficha-pagina__menu-item` (`app-botao`).
8. CSS local das classes migradas remove hover/foco/borda/transição duplicados; mantém só
   geometria/posicionamento.

## Critérios de Aceite

1. `grep -rn "<button\|<a " frontend/src/app/modules/ficha --include=*.html | grep -v "app-botao"`
   não retorna nenhum controle listado nos Entregáveis 1–7 (após `ui-30` também estar feita, a
   busca no módulo inteiro deve voltar vazia salvo os carve-outs do `INDEX`).
2. `npm run test --workspace=frontend` sem regressão nas specs tocadas.
3. `npm run lint --workspace=frontend` sem novos erros.
4. Gate visual (`verify` + `design-fidelity`) em `1920×1080`/`360×800`: criar um agente e uma
   criatura pelo guia, visualizar uma criatura existente em `/painel/:campanhaId/criatura/:id`.
   Análogo: resultado de `ui-28`.

## Fora de Escopo

Lado ficha (jogador) — `ui-30`. Demais módulos, Grupos C/D — ver `INDEX`.

## Dependências

`ui-28`. Coordenar com `ui-30` se `guia-equipamento-loja.component.html` for tocado nas duas specs
(migrar uma vez só, na que for implementada primeiro).
