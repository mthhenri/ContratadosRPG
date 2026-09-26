/**
 * O que mudou na biblioteca de documentos (M9) — o `alteracao` do evento `documento:alterado`.
 * Enum de conteúdo do evento, sem tabela `tipo_*`: nunca é gravado em coluna. A sala que recebe
 * cada valor é decidida pelo `CampanhaGateway` a partir da visibilidade do documento (`m9-02`).
 */
export enum DocumentoAlteracaoEnum {
  CRIADO = 'CRIADO',
  ALTERADO = 'ALTERADO',
  REVELADO = 'REVELADO',
  OCULTADO = 'OCULTADO',
  REMOVIDO = 'REMOVIDO',
  REORDENADO = 'REORDENADO',
}
