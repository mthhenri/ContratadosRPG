/**
 * Tenacidade de uma criatura — o perfil de resistência que define o multiplicador da Vida
 * Máxima (`Vida Máxima = VD × Multiplicador`), de Descartável (×10) a Absoluta (×120 ou
 * mais) (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" > "Saúde").
 * Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum TenacidadeEnum {
  DESCARTAVEL = 'DESCARTAVEL',
  FRAGIL = 'FRAGIL',
  PADRAO = 'PADRAO',
  ROBUSTA = 'ROBUSTA',
  RESISTENTE = 'RESISTENTE',
  IMPLACAVEL = 'IMPLACAVEL',
  ABSOLUTA = 'ABSOLUTA',
}
