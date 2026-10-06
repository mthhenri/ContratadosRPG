# p-099-critico-teste-com-dados-adicionais.spec.md

> **Revisão de 2026-10-06: proposta de correção automática retirada da fila.**
> O autor rejeitou deduzir dano/cura posterior a partir de um teste. Este arquivo mantém
> o registro para revisão; não autoriza ampliar o classificador nem implementar uma correção.
> Nome preservado para não romper as referências da rodada anterior.

## Objetivo

Distinguir teste, bônus que participa do teste e rolagem resultante posterior, sem
presumir pela fórmula qual será a próxima ação. Registrar a limitação e os pontos
que precisam de revisão dentro do fluxo específico de NPC, antes de qualquer mudança.

## Entregáveis

1. Registrar a decisão: Medicina → cura e ataque → dano são operações separadas.
   Um crítico no teste não autoriza disparar, dobrar ou alterar outra rolagem pela
   presença/ausência de dados extras na expressão. A API não conhece a intenção futura.
2. Preservar a reprodução anterior: `3d20kh1cm1+6+1d6`, D20 `[20,11,8]`, D6 `[4]`,
   retorna30, enquanto o teste sem D6 retorna28. Essa observação não prova se uma
   fórmula livre representa teste ou resultado; o total32 era esperado no caso
   específico de Competência do NPC, pelo Guia, e não uma classificação geral de fórmulas.
3. Para m4-19, apresentar separadamente o caso em que o próprio botão de atributo
   identifica a operação como teste e o Guia inclui dado de Categoria no mesmo teste.
   Definir esse contrato na revisão do NPC; não converter a observação em mudança
   automática global no motor. Formação e fórmulas livres não entram por extensão implícita.
4. Não executar esta spec como correção. Sua proposta anterior está retirada; manter
   a decisão em HISTORY/CONTEXT/PROBLEMS e submeter somente os recortes específicos
   que o autor ainda queira revisar. Sem rollback automático da correção já aceita.

## Critérios de Aceite

- Proposta global de classificar teste por quantidade de pools não integra a fila de execução.
- Teste e rolagem posterior aparecem como operações distintas na revisão e na m4-19.
- Dados de Competência são identificados pelo contrato do NPC, não chamados de dano/cura.
- Nenhuma implementação, alteração de resultado persistido, DTO, teste ou fonte autoral.
- Verificação exclusivamente documental: referências e consistência do escopo.

## Fora de Escopo

- Inferir se haverá dano/cura, vincular rolagens arbitrárias, automatizar sua sequência
  ou dobrar resultados futuros a partir da fórmula de um teste.
- Executar a proposta anterior de `ehFormulaTeste`, compensar +2 na UI/service ou
  reverter P-097-01 sem um pedido específico.
- Aprovar a interpretação final do crítico no fluxo de NPC sem revisão do autor.

## Dependências

- Esclarecimento do autor em 2026-10-06; Sistema v4.1.3 > Crítico;
  Guia v4.2.0 > NPC > Modificadores.
- [Revisão e reprodução histórica](../../reviews/m4-19-revisao-guia-v4.2.0.md).
