# m1-20-compras-vendas.spec.md

> Task complementar do milestone `m1-calculadora-paridade.spec.md` (após a m1-19).

## Objetivo

Complementar a aba **Compras** da calculadora com um modo **Venda**: o usuário monta os
itens (com suas modificações e amplificadores) reusando o construtor de carrinho existente e
o sistema calcula **quanto renderia a venda**; inclui também a **venda de fragmentos** por
tabela fixa. Tudo 100% client-side, com toda regra vindo de `shared/regras` — nenhum cálculo
no front, nenhum backend/persistência.

**Antes de qualquer UI, ler `docs/design/DESIGN.md`** e reusar os padrões BEM do tema
(alternador = padrão de tab/seleção ativo em `--accent`; grades e stat boxes já existentes).

Fonte de regras: `docs/core/sistema-v4.1.0.md` — "Loja" (venda por 50%), "Retornando após uma
Missão" (check-in 75% / fora de patente 25%) e "Venda de Fragmentos" (tabela por módulo × tipo).
O documento vence (proibição #27).

## Entregáveis

### 1. Regras (`shared/regras/compras/`) — funções puras + dados tipados, com testes

1. **Taxas de venda de item.** `TaxaVendaEnum` (string enum em `shared/src/enums/`) com
   `NORMAL`, `CHECKIN`, `FORA_PATENTE` e o mapa de multiplicadores correspondente
   (`0.5` / `0.75` / `0.25`) — as três taxas do documento (Loja = metade; entrega no
   check-in = 75%; item fora de patente não entregue = 25%).
2. **Valor de venda do carrinho.** `calcularValorVendaCarrinho({ itens, amplificadores, taxa })`
   → reusa `calcularTotaisCarrinho(...).gasto` e aplica a taxa (arredondado). Não recalcula
   custo de item — apenas a taxa sobre o total já computado pelo motor existente.
3. **Venda de fragmentos.** Enums de conteúdo de jogo em `shared/src/enums/` (§10.3, sem
   tabela `tipo_*`): `FragmentoTipoEnum` (`POTENCIALIZADOR`, `CONSTRUTOR`) e o módulo I–V
   (`FragmentoModuloEnum` ou chave numérica 1–5). Constante `VENDA_FRAGMENTOS` = a tabela do
   documento:

   | Módulo | Potencializador | Construtor |
   | :---: | :---: | :---: |
   | V | 500 | 750 |
   | IV | 1100 | 1600 |
   | III | 2300 | 3300 |
   | II | 4700 | 6700 |
   | I | 10000 | 15000 |

   Função `calcularVendaFragmentos({ contadores })` → soma `quantidade × valor` por
   módulo × tipo. Módulo ∅ **não** entra na tabela (valor negociado com o Mestre — fora do
   cálculo).
4. **Testes unitários** de todas as funções e da coerência da tabela, conferidos contra o
   documento: cada taxa sobre um carrinho conhecido, cada célula da tabela de fragmentos, e o
   total combinado (itens na taxa + fragmentos).

### 2. UI — aba Compras (`compras.page`)

5. **Alternador Comprar / Vender** no topo da aba (estado ativo = `--accent`, padrão de
   tab/seleção do tema). Modo **Comprar** mantém a tela atual intacta.
6. **Modo Vender — itens:** um **carrinho de venda separado** (lista própria, independente do
   carrinho de compra), montado com o **mesmo catálogo / modificações / amplificadores** do
   modo Comprar. O resumo exibe o **valor de venda** com um **seletor de taxa** (Normal 50% /
   Check-in 75% / Fora de patente 25%).
7. **Modo Vender — fragmentos:** bloco com **grade de contadores** por Módulo (V→I) nas
   colunas **Potencializador** / **Construtor**, com subtotal por linha e total do bloco.
8. **Total de venda** = itens (na taxa escolhida) + fragmentos, em stat box de destaque.
9. **Limpar** (botão da m1-19) também reseta modo, carrinho de venda, taxa e contadores de
   fragmentos ao padrão; persistência de carrinho (m1-11) não é afetada negativamente.

## Critérios de Aceite

- Valor de venda de itens = `gasto` do carrinho × taxa, batendo com `shared/regras`; cada
  célula da tabela de fragmentos confere com o documento.
- Zero regra de jogo duplicada no front; funciona offline do backend; `regras/` sem
  dependências externas nem estado.
- Carrinho de venda é independente do de compra (alternar não mistura as duas listas).
- Sem NgModule / `.css` / `style=""` / hex solto (proibições #16–18, #29); SCSS/BEM só com
  tokens do tema.
- 100% das funções novas cobertas por teste.

## Fora de Escopo

- Restrição "equipamento inicial só pode ser vendido ao atingir Operador" e "item
  inutilizável não tem valor" — a calculadora não modela estado/origem de item; viram nota no
  conteúdo de Ajuda (m1-12), não trava de cálculo.
- Forja de fragmentos e redução de módulo (operações de mesa/tempo, não cálculo de venda).
- Módulo ∅ (negociado com o Mestre).
- Backend, persistência e qualquer vínculo com ficha (M3+).

## Dependências

- `m1-05-regras-compras.spec.md` (motor `calcularTotaisCarrinho`), `m1-10-pagina-compras.spec.md`
  (aba e carrinho) e `m1-19` (botão Limpar).
