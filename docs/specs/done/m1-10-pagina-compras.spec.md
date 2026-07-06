# m1-10-pagina-compras.spec.md

> Task 10/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Entregar a página `compras` — a mais pesada — com catálogo, carrinho, modificações,
amplificadores, peso e totais, consumindo `shared/regras/compras`. Estado do carrinho na UI;
persistência e export/import ficam para a m1-11.

**Antes de qualquer UI, ler `docs/design/DESIGN.md`** e reusar os padrões BEM do tema.

## Entregáveis

1. **Catálogo** com busca e filtro por categoria (paridade com `renderCmpCatalog`,
   `buildAmpCatalogHtml`, `buildRegularItemsHtml`, `setCmpCat`, `setCmpSearch`).
2. **Carrinho** com adicionar/remover itens, modificações e amplificadores, e painéis de
   modificação (`addToCart`, `removeFromCart`, `addMod`/`removeMod`, `addAmp`/`removeAmp`,
   `toggleModPanel`, `toggleStored`, `limparCarrinho`) — estado em **Signals**.
3. **Resumo/totais** (`renderCmpSummary`, `renderCmpCart`) com todos os números vindos de
   `shared/regras/compras` (`computeItemStat`, `getCmpTotals`) — nenhum cálculo no front.

## Critérios de Aceite

- Mesmas saídas do site antigo para o mesmo carrinho (itens/mods/amplificadores).
- Zero regra de jogo duplicada no front; funciona offline do backend.
- Sem NgModule/`.css`/`style=""`/hex solto (proibições #16–18, #29).

## Fora de Escopo

- Persistência em localStorage e export/import por código compartilhável (m1-11).
- Conteúdo de ajuda (m1-12); troca de tema em runtime (m1-13).

## Dependências

- `m1-05-regras-compras.spec.md` e `m1-06-frontend-calculadora-base.spec.md`.
