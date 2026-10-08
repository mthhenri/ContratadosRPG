# m10-04-svg-scp-definitivo.spec.md

> Task do milestone `m10-regras.spec.md`. Independente. **Envolve desenho: cada versão do SVG passa
> pela aprovação do autor antes de entrar no produto.**

> **Estado em 2026-10-08:** [prancha v1](m10-04-svg-scp-definitivo/m10-04-scp-aprovacao.html)
> preparada e inspecionada nos quatro viewports. O autor revisou o uso: logo SCP oficial
> somente na identidade de Criatura; marca própria SCP + D20 nos níveis e em Regras.
> A prancha passa a separar os dois usos, preservando os assets oficiais preparados.
> Paleta/fundos, crédito e gates de incorporação permanecem abertos.
> [Evidências e etapas abertas](m10-04-svg-scp-definitivo/m10-04-proposta-v1.md).

## Objetivo

Ter SVGs em **formas preenchidas**, legíveis de 16px a 96px, com usos distintos:
o logo SCP oficial identifica somente `criatura` (`m10-03`); a marca própria de
ContratadosRPG (SCP misturado com D20) identifica Regras na topbar e os oito níveis
de ameaça pintados pela cor do nível. A marca própria é o padrão geral do produto;
novas exceções para o logo oficial exigem decisão explícita do autor.

## Contexto

O `logo-white.svg` atual é contorno vetorizado de relevo: desmancha ao colorir e não lê em tamanho
de ícone. No exemplão, a silhueta dos níveis vem da imagem original do Docs (provisória).

## Entregáveis

1. SVG oficial em formas preenchidas, com variante de ícone (viewBox 24, no
   `app-icone` como `scp`, identidade `criatura`). Preservar as variantes e tamanhos
   já preparados, sem usá-los nos níveis ou na topbar. Marca própria SCP + D20
   em variante de ícone e silhueta para esses usos; preservar sua identidade,
   eliminando apenas relevo/ruído que prejudique preenchimento e escala.
2. Cores dos 8 níveis tiradas das 8 imagens originais do Docs, como tokens em
   `docs/design/tema/_tokens.scss` (dark e light). Catastrófica (preta) ganha fundo claro.
3. **Crédito CC BY-SA 3.0** do logo SCP no rodapé das Regras (texto conferido com o autor) e
   registro da licença em `docs/design/`.
4. Prancha de aprovação (HTML standalone na pasta de anexos desta spec) com os tamanhos e os 8 níveis.

## Fora de escopo

Renderizar os níveis no leitor (`m10-07`); trocar a topbar (`m10-06`).
