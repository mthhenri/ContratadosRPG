# m3-14-ficha-editor-inventario.spec.md

> Task 14 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Editor **no próprio lugar** da aba **Inventário** (`m3-11`): o `inventario` do `dados` — itens (com
modificações) + amplificadores, **reusando o formato do carrinho da calculadora M1**
(`CarrinhoItemDto`/`AmplificadorAplicadoDto` de `shared/regras/compras`, sem tipo duplicado — como já
fixa `m3-01`). Permite montar/editar o inventário da ficha reaproveitando a UI e as regras de compras.

## Entregáveis

1. **Lista de itens** com nome, categoria, custo/peso, quantidade, "guardada" e modificações; e a
   lista de **amplificadores** acoplados.
2. **Adicionar/editar/remover** item e amplificador reusando os componentes/regras da calculadora de
   compras (M1) — **sem reimplementar** cálculo de custo/peso/limites (proibição #26).
3. **Inventário máximo** (`Força × 5`) exibido como referência a partir de `derivados.inventarioMaximo`
   (editável em `m3-10`); ultrapassar é **aviso**, não trava (liberdade total).
4. Cada mutação persiste via `alterarFicha` (otimista), padrão granular de `m3-10`.
5. Standalone, Signals, Reactive Forms, `.scss`/BEM com tokens.

## Critérios de Aceite

- Dono/mestre monta e edita o inventário da ficha; recarregar mantém itens/modificações/amplificadores.
- Reusa `shared/regras/compras` (mesmos contratos e cálculos da calculadora M1), sem duplicar.
- Peso/limite mostrados como referência; exceder não bloqueia o salvamento.

## Fora de Escopo

- Loja/compra-venda com saldo (Dinheiro corrente ainda fora do contrato) — só o inventário da ficha.
- Refino mobile dedicado (`m3-09`).

## Dependências

- `m3-10` (edição granular + `derivados.inventarioMaximo`), `m3-11` (aba Inventário),
  `m3-01` (contrato `FichaInventarioDto`), M1 (`shared/regras/compras` + UI da calculadora).
