/**
 * Comportamento de uma criatura — como ela age no mundo, define o ritmo da missão
 * (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" > "Comportamento e
 * Motivação"). Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum ComportamentoCriaturaEnum {
  CACADORA = 'CACADORA',
  TERRITORIAL = 'TERRITORIAL',
  OPORTUNISTA = 'OPORTUNISTA',
  INDIFERENTE = 'INDIFERENTE',
  INTELIGENTE = 'INTELIGENTE',
  CAOTICA = 'CAOTICA',
}
