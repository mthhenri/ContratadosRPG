# m3-44-inventario-sub-inventarios-listas.spec.md

> Task 41 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Reorganizar a aba **Inventário**: (14) **pochete e bolsa de corpo como inventários separados**;
(19) **lista separada para Fragmentos** (igual à de amplificadores), cabendo em **1920×1080**;
(12) **amplificadores em grid de 2 colunas**.

## Entregáveis

1. **Sub-inventários (item 14).** Modelar o "container" de cada item de Armazenamento
   (`ItemCategoriaEnum.ARMAZENAMENTO`) para que Pochete e Bolsa de Corpo sejam **listas
   separadas** de itens, cada uma com seu limite. Provável novo campo em `CarrinhoItemDto`
   (ex.: `containerId?`) e/ou estrutura em `FichaInventarioDto`
   (`shared/src/dtos/ficha/ficha.dtos.ts`). Reusar o conceito de `guardada`/`vestida`
   (`ficha-inventario.component.ts` ~linha 880) e o `bonusInventario` do resumo (~linha 402).
   Atualizar `docs/SCHEMA.md`.
2. **Lista separada de Fragmentos (item 19).** Uma seção própria para Fragmentos no Inventário,
   no mesmo padrão da de amplificadores (`ficha-inventario.component.ts` ~linha 530), com máscara
   de overflow/fade quando necessário. **Restrição de layout:** o conjunto Itens + Amplificadores
   + Fragmentos deve **caber em 1920×1080** sem estourar — usar grades que refluem (padrão da
   `m3-26`/`m1-15`).
3. **Amplificadores em grid de 2 colunas (item 12).** Trocar a lista de amplificadores para
   `grid-template-columns: repeat(2, 1fr)` (com override mobile para 1 coluna via
   `_breakpoints.scss`, padrão da `m3-26`). Só tokens do tema.
4. Ajustar os cálculos de peso/limite para respeitar os sub-inventários (o total continua saindo
   de `shared/regras/compras`, nunca no componente).

## Critérios de Aceite

- Pochete e Bolsa de Corpo aparecem como listas distintas, cada uma com seu conteúdo e limite.
- Fragmentos têm lista própria; Itens/Amplificadores/Fragmentos cabem numa tela 1920×1080.
- Amplificadores em 2 colunas no desktop, 1 no mobile.
- Peso/limite continuam calculados por `shared/regras/compras`.

## Fora de Escopo

- Mecânica de fragmentos (é a `m3-42`) — aqui só a organização visual/estrutural da lista.
- Rolar dano nas armas (é a `m3-45`).

## Dependências

- `m3-14` (editor de Inventário), `m3-35` (fragmentos no inventário), `m3-26` (padrão de grades
  que refluem + breakpoints).
