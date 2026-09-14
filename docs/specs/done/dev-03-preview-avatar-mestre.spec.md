# dev-03-preview-avatar-mestre.spec.md

> Task avulsa: concluir a amostra visual do seed de desenvolvimento e tornar a identidade dos agentes consultável pelo mestre.

## Objetivo

Sincronizar os PNGs ajustados dos agentes no seed local e oferecer, no modal **Membros** da visão de campanha do mestre, a mesma prévia ampliada de avatar disponível ao jogador.

## Entregáveis

1. O seed copia novamente os PNGs de `backend/tools/database/assets/agentes/` para os uploads locais ao ser executado.
2. Ao manter o cursor sobre o avatar de uma ficha no modal **Membros**, o mestre vê a imagem completa em uma prévia de 300 px, posicionada ao lado do gatilho e limitada à janela.
3. A prévia só existe quando a ficha possui imagem, fecha ao sair do avatar ou destruir a página e não é aplicada às criaturas.

## Critérios de aceite

1. O teste do detalhe do mestre comprova que a prévia abre somente após o hover sustentado e fecha ao sair.
2. `npm run db:seed:dev --workspace=backend` conclui e disponibiliza os PNGs atualizados.
3. A aplicação real confirma o comportamento em 1920×1080 e 360×800, sem overflow ou recorte da imagem ampliada.

## Fora de escopo

- Alterar as imagens de criaturas ou seus dados.
- Criar novos controles visuais, schema, migrations ou contratos públicos.

## Referência visual

O componente análogo aprovado é o avatar da lista **Esquadrão** de `detalhe-jogador`: mesma espera de 600 ms, tamanho de 300 px, `position: fixed`, `object-fit: contain`, moldura e cálculo de posição.
