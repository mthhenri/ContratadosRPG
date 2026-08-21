# m7-12-layout-desktop-iniciativa.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Compactar pontualmente a fila de iniciativa na visão desktop do jogador, preservando o shell em
`85vw`, e permitir que o próprio jogador encerre sua vez pelo mesmo avanço de iniciativa já usado
pelo mestre.

## Entregáveis

1. Manter a tela Iniciativa com largura fixa de `85vw`; nenhuma região pode expandir o shell para
   ocupar toda a largura disponível.
2. Na visão desktop dividida do jogador, apresentar os cartões em duas colunas, com retrato e
   espaçamentos compactos sem usar `transform: scale()`.
3. Exibir até três linhas de cartões; a partir do sétimo combatente, somente a grade recebe rolagem
   vertical.
4. Não renderizar o bloco de controles do jogador quando ele não tiver uma ação disponível,
   eliminando a barra vazia entre “Sua vez” e a grade.
5. Exibir “Avançar turno” ao jogador somente durante a vez do combatente vinculado à sua própria
   ficha. O mestre continua podendo avançar normalmente, e o backend deve rejeitar qualquer avanço
   de outro jogador ou fora da própria vez.
6. Preservar os cartões e controles do mestre, a ficha lateral e o layout mobile existentes.

## Critérios de Aceite

- Em `1920×1080`, o shell mede `85vw`; a visão do jogador usa duas colunas compactas e seis cartões
  cabem antes da rolagem interna da grade.
- A barra vazia não existe após a iniciativa do jogador já ter sido registrada.
- “Avançar turno” aparece e funciona apenas na própria vez; uma chamada direta indevida é recusada
  pelo backend.
- Em `360×800`, não há regressão visual nem overflow horizontal.
- Verificação pela skill `verify` nos dois viewports; testes focados de frontend e backend, builds
  verdes e lint do frontend limpo.

## Fora de Escopo

- Alterar a ficha lateral, redesenhar os controles do mestre ou mudar a disposição mobile.
- Criar novas ações de condução para jogadores além de encerrar a própria vez.

## Dependências

- `m7-05`, `m7-06`, `m7-08` e `m7-09`.
