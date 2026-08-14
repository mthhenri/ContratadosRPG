/**
 * Origem de uma criatura na Ficha de Identidade: adaptada de um SCP existente ou uma
 * criação original (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" >
 * "Identidade e Classificação"). Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*`
 * (§10.3).
 */
export enum OrigemCriaturaEnum {
  SCP_ADAPTADO = 'SCP_ADAPTADO',
  ORIGINAL = 'ORIGINAL',
}
