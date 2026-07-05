/**
 * Motivo pelo qual um novo agente entra no esquadrão — determina o divisor de
 * dedução do Prestígio inicial, se o agente pode iniciar uma patente abaixo da
 * média do grupo e se recebe a condição Amaldiçoado pelo Passado. Entrada da
 * calculadora de novo agente (`regras/novo-agente`, m1-03), não é conteúdo de
 * JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Iniciando um Novo Agente" > "Prestígio
 * Inicial" e "Aposentadoria" > "Contido ou Exterminado". Os sufixos
 * `SUCESSOR_CONVENCIONAL`/`SUCESSOR_EXPERIMENTO` refletem a humanidade do
 * sucessor (÷5 convencional / ÷3 Experimento — doc "Contido ou Exterminado").
 * O site antigo (`contratados-calculadora/src/script.js`) chamava estas opções
 * de "Experimento → Regular/Experimento" e "Contido/Exterminado →
 * Regular/Experimento".
 */
export enum MotivoEntradaAgenteEnum {
  MORTE_OU_INICIO_DO_ZERO = 'MORTE_OU_INICIO_DO_ZERO',
  APOSENTADORIA = 'APOSENTADORIA',
  EXPERIMENTO_SUCESSOR_CONVENCIONAL = 'EXPERIMENTO_SUCESSOR_CONVENCIONAL',
  EXPERIMENTO_SUCESSOR_EXPERIMENTO = 'EXPERIMENTO_SUCESSOR_EXPERIMENTO',
  CONTIDO_OU_EXTERMINADO_SUCESSOR_CONVENCIONAL = 'CONTIDO_OU_EXTERMINADO_SUCESSOR_CONVENCIONAL',
  CONTIDO_OU_EXTERMINADO_SUCESSOR_EXPERIMENTO = 'CONTIDO_OU_EXTERMINADO_SUCESSOR_EXPERIMENTO',
}
