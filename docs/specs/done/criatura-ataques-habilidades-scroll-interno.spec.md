# criatura-ataques-habilidades-scroll-interno.spec.md

> Spec avulsa (ajuste). Pedido do autor: "lá na tela de criatura, colocar um scroll nos ataques e
> nas habilidades. Por conta de que, se tem muitos ataques ou muitas habilidades, a ficha vai indo lá
> pra baixo. Devia pôr um scroll interno nessas duas caixas, pra altura da coluna do lado."

## Problema (medido)

Na ficha de criatura (`CriaturaVisualizacao`) a coluna Status estica junto com a coluna
Identidade+Atributos (`align-items: stretch`), mas quem manda na altura é a mais alta: com 14 ataques
a aba Ataques mede 905px (1920×1080) e arrasta a coluna da Identidade junto, abrindo um vão embaixo
de Atributos; a 1366×768 chega a 2111px, e com 14 habilidades, 1835px. A aba Geral mede 740px
(1920×1080), que é a altura própria da coluna Identidade+Atributos.

## Análogo aprovado

A coluna Status da **ficha de jogador** (`FichaVisualizacao`):
`.ficha-visao__coluna--status` usa `contain: size; overflow: hidden` acima de `bp.$bp-tablet` — o
conteúdo de Status deixa de definir a altura da fileira, que passa a ser a da coluna vizinha — e o
painel longo rola por dentro; a lista de `FichaHabilidades` (`habilidades__lista`) rola por dentro com
`appOverflowFade` (fade só onde há corte). Mesma receita, sem inventar controle novo.

## Entregas

1. `CriaturaVisualizacao`: com a aba **Ataques** ou **Habilidades** ativa e o layout em duas colunas
   (acima de `bp.$bp-tablet`; com o painel lateral de Rolagens aberto, acima de
   `$bp-tablet + $reserva-painel-lateral`, mesmo critério do `--apertado`), a coluna Status ganha
   `contain: size`: a altura passa a ser a da coluna Identidade+Atributos.
2. `CriaturaAtaqueLista` e `CriaturaHabilidadeLista`: cabeçalho (título, contagem, lápis, "+") fica
   fixo e só a lista de cartões rola por dentro, com `appOverflowFade` (mesmo fade da
   `habilidades__lista`). Em Ataques, a "Rolagem rápida" acima da lista também fica fixa.
3. Empilhado (tablet/mobile) **não muda**: sem coluna ao lado não há altura de referência, e a
   decisão m3-60 da ficha de jogador é que a página inteira role como uma coisa só, sem rolagem
   dentro de rolagem.
4. A aba **Geral** não muda (Descrição em Markdown pode ser longa; o autor pediu só Ataques e
   Habilidades).

## Fora de escopo

- Ficha de jogador (já tem o comportamento) e a tela de criação de criatura.

## Verificação

Testes focados dos três componentes; ao vivo, com uma criatura de 14 ataques e 14 habilidades, em
`1920×1080`, `1366×768`, `960×1080` (empilhado) e `360×800`, em Chromium e Edge (e Firefox para a
barra): altura da coluna Status igual à da Identidade+Atributos, lista rolando por dentro, fade,
edição/adição de item dentro da área rolável, sem overflow horizontal.
