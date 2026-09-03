# Acervo de fichas — margem do conteúdo no mobile

> Task avulsa derivada da revisão responsiva: a página `/fichas` conserva a largura limitada do
> acervo desktop quando entra no breakpoint mobile.

## Objetivo

Fazer o conteúdo do acervo de fichas ocupar a largura disponível no mobile, preservando o padding
canônico da rota e a composição atual em tablet e desktop.

## Entregáveis

1. `.acervo` remove, no breakpoint mobile, a largura máxima e a margem automáticas usadas pela
   listagem desktop.
2. Os cartões, ações, filtro e lista do acervo continuam acessíveis sem corte ou overflow
   horizontal.

## Critérios de Aceite

- Em `360×800`, `.acervo` ocupa a largura interna da rota sem margem lateral adicional e não
  excede a viewport.
- Em `960×1080` e `1920×1080`, o limite de 80vw e a centralização desktop permanecem inalterados.
- A aplicação real é comparada ao análogo `docs/design/examples/acervo-de-fichas.html`; testes,
  lint e build do frontend passam.

## Fora de Escopo

- Alterar o conteúdo dos cartões, filtro, ações ou menus do acervo.
- Alterar outras rotas de fichas ou de campanha.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
`docs/design/examples/acervo-de-fichas.html` e `FichaAcervo`.
