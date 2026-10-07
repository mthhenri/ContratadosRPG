# m10-08-painel-flutuante-e-celular.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-05` e `m10-06`. Fonte visual: exemplão,
> aba *Protótipo*, modos painel e celular.

> **Antes de qualquer UI:** `docs/design/DESIGN.md` (seção "Painel flutuante, modal e painel
> lateral") e `docs/design/tema/`; skills `design-fidelity` e `verify`. Análogo aprovado:
> **Biblioteca em painel flutuante** (`m9-11`/`m9-12`) — mesmo ↗ para a página completa.

## Objetivo

Abrir as Regras em painel flutuante por padrão (topbar e demais pontos que hoje abrem o leitor de
PDF) e dar ao celular o mesmo leitor com gaveta de sumário.

## Entregáveis

1. **Painel flutuante** (`app-painel-flutuante`) com o mesmo conteúdo da página: texto sempre
   visível + **`app-gaveta`** de sumário (☰). ↗ abre a página completa na seção atual. Maximizado,
   o painel usa o layout de dois trilhos da página.
2. **Celular:** página e painel com gaveta de sumário; texto ocupa a largura toda.
3. **Substituição dos pontos de entrada** que hoje usam `shared/leitor-documentos/` (topbar no
   `layout.component` e `ficha-flutuante`) pelo novo leitor. O componente antigo permanece só para
   o download provisório até a `m10-11`.
4. Seção atual preservada ao alternar painel ↔ página e Sistema ↔ Guia (cada documento lembra a
   sua).

## Verificação

`verify` em 1920×1080, 1366×768, 768×1024 e 360×800: abrir pela topbar e pela ficha flutuante,
gaveta aberta/fechada, maximizar, ↗, link interno dentro do painel. Comparar com a Biblioteca
flutuante.

## Fora de escopo

Pesquisa (`m10-09`).
