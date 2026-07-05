/**
 * Patentes de agente, concedidas por faixa de Prestígio. Conteúdo de JSONB
 * `ficha.dados` — sem tabela `tipo_*` (§10.3). Fonte: docs/core/sistema-v4.1.0.md
 * — "Prestígio e Patentes" (nomes completos do documento; o site antigo
 * abreviava "Força Tarefa Especial" para "FT Especial" e "Operações Especiais"
 * para "Op. Especiais" — documento vence, proibição #27).
 */
export enum PatenteEnum {
  AGENTE = 'AGENTE',
  OPERADOR = 'OPERADOR',
  EXPERIENTE = 'EXPERIENTE',
  VETERANO = 'VETERANO',
  FORCA_TAREFA = 'FORCA_TAREFA',
  FORCA_TAREFA_ESPECIAL = 'FORCA_TAREFA_ESPECIAL',
  OPERACOES_ESPECIAIS = 'OPERACOES_ESPECIAIS',
  LIDER_OPERACIONAL = 'LIDER_OPERACIONAL',
}
