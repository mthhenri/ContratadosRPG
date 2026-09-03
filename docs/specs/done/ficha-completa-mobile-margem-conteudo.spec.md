# Ficha completa — margem do conteúdo no mobile

> Task avulsa derivada da revisão da campanha: a página de ficha completa conserva a margem
> horizontal desktop quando entra no breakpoint mobile.

## Objetivo

Remover o deslocamento lateral da ficha completa em mobile, mantendo o padding interno e a
composição existente em tablet e desktop.

## Entregáveis

1. `.ficha-pagina` zera a margem horizontal herdada do desktop no breakpoint mobile, em sincronia
   com a largura total já declarada para a rota.
2. A ficha completa continua com navegação móvel, controles e abas utilizáveis sem corte ou
   overflow horizontal.

## Critérios de Aceite

- Em `360×800`, `.ficha-pagina` tem margem horizontal computada em zero e não excede a viewport.
- Em `960×1080` e `1920×1080`, a margem desktop é preservada e o layout não ganha overflow.
- A aplicação real é comparada ao análogo `docs/design/examples/ficha-de-jogador.html`; testes,
  lint e build do frontend passam.

## Fora de Escopo

- Alterar o conteúdo, os controles ou a navegação da ficha.
- Alterar o layout da campanha, que possui spec e correção próprios.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
`docs/design/examples/ficha-de-jogador.html` e `FichaVisualizar`.
