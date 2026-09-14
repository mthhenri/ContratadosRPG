# dev-04-rolagens-cenario-e-cartao.spec.md

## Objetivo

Exibir no cartão do Esquadrão a última rolagem já carregada pelo feed da campanha e semear históricos de exemplo para fichas de agente e criaturas.

## Entregáveis

1. Cada cartão de agente do mestre recebe a rolagem mais recente daquela ficha presente no feed.
2. O seed DEV grava rolagens válidas e determinísticas para todas as fichas de agente e criatura.

## Critérios de aceite

1. Um teste da visão de mestre prova que a rolagem visível no feed aparece no cartão da mesma ficha.
2. O seed é idempotente e o histórico deixa de nascer vazio.

## Fora de escopo

- Alterar a regra de resolução de dados ou a aparência do cartão.
