# m10-04-svg-scp-definitivo.spec.md

> Task do milestone `m10-regras.spec.md`. Independente. **Envolve desenho: cada versão do SVG passa
> pela aprovação do autor antes de entrar no produto.**

## Objetivo

Ter um SVG do logo SCP em **formas preenchidas**, que sirva ao mesmo tempo de ícone da topbar
(Regras), de ícone `criatura` (`m10-03`) e de silhueta dos 8 níveis de ameaça pintada pela cor do
nível.

## Contexto

O `logo-white.svg` atual é contorno vetorizado de relevo: desmancha ao colorir e não lê em tamanho
de ícone. No exemplão, a silhueta dos níveis vem da imagem original do Docs (provisória).

## Entregáveis

1. SVG em formas preenchidas, legível de 16px a 96px, com variante de ícone (viewBox 24, no
   `app-icone` como `scp`) e variante de silhueta para os níveis.
2. Cores dos 8 níveis tiradas das 8 imagens originais do Docs, como tokens em
   `docs/design/tema/_tokens.scss` (dark e light). Catastrófica (preta) ganha fundo claro.
3. **Crédito CC BY-SA 3.0** do logo SCP no rodapé das Regras (texto conferido com o autor) e
   registro da licença em `docs/design/`.
4. Prancha de aprovação (HTML standalone em `docs/design/propostas/`) com os tamanhos e os 8 níveis.

## Fora de escopo

Renderizar os níveis no leitor (`m10-07`); trocar a topbar (`m10-06`).
