# m1-05-regras-compras.spec.md

> Task 5/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Extrair para `shared/regras/compras/` o domínio mais pesado da calculadora: catálogo,
modificações, amplificadores, custos, conflitos, peso e totais — com testes contra
`docs/core/sistema-v4.1.0.md`.

## Entregáveis

1. **Dados tipados** em `regras/dados/` (ou `regras/compras/`): categorias e catálogo de
   itens (`CATALOGO_CATS`, `CATALOGO_ITENS`), modificações (`MODIFICACOES`, `MOD_CUSTO`),
   amplificadores e limites por patente (`PATENTES_MOD`).
2. **Fórmulas puras** em `regras/compras/` (entregável 1 da milestone): limites por patente
   (`getPatenteMod`), custo de modificação (`getModCusto`), peso de modificação
   (`getModPeso`), conflitos entre modificações, resolução de amplificadores, stat computado
   de item (`computeItemStat`), peso de inventário e totais do carrinho (`getCmpTotals`).
3. Testes unitários de **todas** as fórmulas e da coerência do catálogo, conferidos contra o
   documento do sistema.

## Critérios de Aceite

- Mesmas saídas de cálculo do site antigo para os mesmos itens/mods/amplificadores;
  conformidade com `docs/core/sistema-v4.1.0.md` (documento vence — proibição #27).
- 100% das fórmulas cobertas por teste; `regras/` sem dependências externas nem estado.

## Fora de Escopo

- Página de compras, estado do carrinho, catálogo/busca na UI (m1-10).
- Persistência em localStorage e export/import por código (m1-11).

## Dependências

- `m1-01-regras-fundacao-enums.spec.md`.
