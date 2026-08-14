/**
 * Intensidade da Regeneração Natural de uma criatura — define o % da Vida Máxima recuperado,
 * de Residual (5% Passiva / 20% Condicional) a Imparável (35% Passiva / 50% Condicional)
 * (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" > "Regeneração
 * Natural"). Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum RegeneracaoIntensidadeEnum {
  RESIDUAL = 'RESIDUAL',
  MODERADA = 'MODERADA',
  ALTA = 'ALTA',
  SEVERA = 'SEVERA',
  IMPARAVEL = 'IMPARAVEL',
}
