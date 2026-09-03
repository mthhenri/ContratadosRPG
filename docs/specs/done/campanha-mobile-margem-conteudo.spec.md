# Campanha — margem do conteúdo no mobile

> Task avulsa originada do relato do autor: a campanha conserva uma margem lateral de desktop no
> mobile, deslocando e cortando visualmente tanto a visão de jogador quanto a de mestre.

## Objetivo

Remover no mobile o deslocamento lateral indevido do contêiner principal da campanha, preservando
o respiro interno canônico de cada card. A correção deve valer para as duas visões de campanha.

## Entregáveis

1. O contêiner `.detalhe` ocupa a largura disponível no breakpoint mobile sem herdar a margem
   horizontal da composição desktop.
2. Jogador e mestre mantêm seus cards, controles e navegação utilizáveis sem corte ou overflow
   horizontal em mobile; os layouts tablet e desktop não mudam.

## Critérios de Aceite

- Em `360×800`, a margem computada de `.detalhe` é zero e a largura do contêiner não excede a
  viewport, nas visões de jogador e mestre.
- A aplicação real é comparada ao análogo `docs/design/examples/ficha-de-jogador.html` em
  `360×800`, `960×1080` e `1920×1080`: densidade, hierarquia, foco e alvos de toque preservados;
  não há overflow horizontal.
- Testes, lint e build do frontend passam.

## Fora de Escopo

- Redesenhar cards, topbar, ficha compacta ou painel de rolagens.
- Alterar a margem desktop, a largura de painéis laterais ou regras de campanha.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
`docs/design/examples/ficha-de-jogador.html` e `CampanhaDetalhe`.

## Riscos e Mitigação

A margem desktop é necessária para centralizar a área de trabalho. A regra fica limitada ao mixin
`bp.mobile`, onde a largura já é deliberadamente `100%`.
