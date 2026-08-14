import type { BonusIniciativaSugerirDto } from './criatura.dtos';

/** Bônus de Iniciativa sugerido ≈ 10% do VD, arredondado para baixo
 * (docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de Ameaças" > "Cadência" >
 * "Iniciativa" — exemplo do próprio documento: "VD 37 teria +3"). Pura sugestão: o Mestre
 * define o valor final de `iniciativaBonus` livremente; turnos por rodada não têm fórmula,
 * são a escolha de `CadenciaEnum` (decisão de conceito, não de cálculo). */
export function calcularBonusIniciativaSugerido(dto: BonusIniciativaSugerirDto): number {
  return Math.floor(dto.vd * 0.1);
}
