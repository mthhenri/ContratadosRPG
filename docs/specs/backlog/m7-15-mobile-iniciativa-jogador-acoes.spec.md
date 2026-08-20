# m7-15-mobile-iniciativa-jogador-acoes.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

No mobile da visão de jogador da Iniciativa, reposicionar o acesso à própria ficha e restabelecer a
funcionalidade do botão de rolagens dentro da ficha aberta.

## Entregáveis

1. Reposicionar o gatilho de acesso à ficha para uma área alcançável pelo polegar, sem encobrir
   cartão, log, histórico de rolagens ou a barra de ação do mestre.
2. Corrigir a ligação do botão/aba de **Rolagens** na ficha flutuante para que ele execute o fluxo
   de rolagem já existente no mobile. Reutilizar `FichaRolagensPainel`, `executar-rolagem` e os
   serviços de registro existentes; não duplicar cálculo nem criar um segundo handler de resultado.
3. O jogador mantém somente as ações permitidas sobre a própria ficha; visualizador continua sem
   capacidade de rolar e nenhuma ação de condução do encontro é introduzida.
4. Usar como análogos a barra de ações mobile da ficha e a ficha flutuante atual. O componente usa
   apenas sinais de intenção e CSS por breakpoint, sem `matchMedia`.

## Critérios de Aceite

- Em `360×800`, o acesso à ficha é visível e tocável em todas as posições relevantes da tela.
- Abrir a ficha e acionar Rolagens permite fazer uma rolagem válida e registrar/exibir o resultado
  pelo fluxo existente, sem erro no console nem fechamento inesperado do dialog.
- Em desktop, os controles seguem operáveis e sem mudança de permissão.
- Verificação pela skill `verify` em `360×800` e `1920×1080`, com jogador dono e usuário apenas
  visualizador; `npm run test -w frontend` verde e `npm run lint -w frontend` limpo.

## Fora de Escopo

- Criar presets, formatos de dados ou histórico novo de rolagens (coberto por `m7-10`).

## Dependências

- `m7-06`, `m7-08` e `m7-14` (visão do jogador, responsividade e dialog corrigido).
