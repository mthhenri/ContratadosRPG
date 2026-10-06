# p-099-critico-teste-com-dados-adicionais.spec.md

> **Estado: DESCARTADA — NÃO EXECUTAR. Decisão do autor em 2026-10-06.**
> Arquivo preservado exclusivamente como memória da proposta e do motivo do descarte.
> Sua permanência em `backlog/` mantém as referências existentes; não o inclui na fila
> de execução. Não mover para `active/` ou tratar como dependência da m4-19.

## Objetivo

Preservar a decisão de descartar a proposta de identificar ou rastrear, a partir de
uma rolagem de teste, os dados resultantes de uma operação posterior. Este arquivo
documenta uma decisão encerrada; não define trabalho de implementação futuro.

## Motivo do descarte

O sistema atual não rastreia um vínculo entre o teste e uma eventual rolagem resultante.
Medicina seguida de cura e ataque seguido de dano são operações separadas. A fórmula
do teste descreve a rolagem atual e não permite saber se o usuário fará outra depois.
Quantidade de pools, presença de D4/D6 ou ausência desses dados não revela essa intenção.

O autor considerou a proposta complexa e sem utilidade para o sistema atual e decidiu
que ela não será executada. Não criar rastreamento, inferência ou sequência automática
para viabilizá-la. Manter o arquivo evita que a mesma proposta seja reaberta como um
defeito ainda aguardando correção em outra sessão.

## Entregáveis

1. Registrar o descarte em HISTORY/CONTEXT/PROBLEMS e na fila consolidada, sem código.
   Crítico de um teste não autoriza vincular, disparar ou alterar uma rolagem futura.
2. Preservar a reprodução anterior: `3d20kh1cm1+6+1d6`, D20 `[20,11,8]`, D6 `[4]`,
   retorna30, enquanto o teste sem D6 retorna28. O total32 era hipótese da análise
   inicial, sem aprovação como regra geral. Essa reprodução histórica não comprova
   um defeito de classificação nem autoriza corrigir o motor por meio desta spec.
3. Dados de Competência que participam do próprio teste NPC pertencem ao contrato
   explícito da m4-19. Não são uma operação futura a rastrear. Eventuais decisões
   desse fluxo permanecem na m4-19, sem reativar ou executar a P-099.
4. Preservar o arquivo e seus links por enquanto. Uma pasta `discard`/`trash` é apenas
   uma ideia para avaliação posterior; nenhuma pasta ou política nova é criada agora.

## Critérios de Aceite

- Estado DESCARTADA/NÃO EXECUTAR explícito; nenhuma tarefa de implementação pendente aqui.
- Proposta global de classificar teste por quantidade de pools não integra a fila de execução.
- Teste e rolagem posterior aparecem como operações distintas na revisão e na m4-19.
- Dados de Competência são identificados pelo contrato do NPC, não chamados de dano/cura.
- Nenhuma implementação, alteração de resultado persistido, DTO, teste ou fonte autoral.
- Verificação exclusivamente documental: referências e consistência do escopo.
- Retomar a proposta exige nova decisão expressa do autor; atualização de documentos,
  retomada do backlog ou execução da m4-19 não autorizam sua reabertura automática.

## Fora de Escopo

- Inferir se haverá dano/cura, vincular rolagens arbitrárias, automatizar sua sequência
  ou dobrar resultados futuros a partir da fórmula de um teste.
- Executar a proposta anterior de `ehFormulaTeste`, compensar +2 na UI/service ou
  reverter P-097-01 sem um pedido específico.
- Aprovar a interpretação final do crítico no fluxo de NPC sem revisão do autor.
- Criar pasta de descarte ou alterar o fluxo canônico das specs nesta rodada.

## Dependências

- Nenhuma dependência executável; nenhuma outra task depende da execução da P-099.
- Referências históricas: decisão do autor em 2026-10-06; Sistema v4.1.3 > Crítico;
  Guia v4.2.0 > NPC > Modificadores.
- [Revisão e reprodução histórica](../../reviews/m4-19-revisao-guia-v4.2.0.md).
