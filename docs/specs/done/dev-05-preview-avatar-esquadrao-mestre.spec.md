# dev-05-preview-avatar-esquadrao-mestre.spec.md

## Objetivo

Exibir a prévia ampliada do retrato ao passar o cursor sobre um agente do Esquadrão na página de
campanha do mestre.

## Entregáveis

1. O cartão reutilizável de ficha emite eventos de entrada e saída no avatar quando usado pelo
   mestre.
2. A página do mestre abre a prévia de 300 px após 600 ms, posicionada ao lado do avatar, e a
   fecha ao sair.
3. O modal Membros não apresenta esse comportamento.

## Critérios de aceite

1. Uma ficha de agente com retrato abre a imagem integral, sem recorte.
2. A prévia não é criada para criaturas sem imagem.
3. O comportamento é coberto por teste do cartão e da página mestre.
