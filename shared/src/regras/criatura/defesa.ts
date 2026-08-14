import { ModificadorCriaturaEnum } from '../../enums';
import type { DefesaBaseCalcularDto } from './criatura.dtos';

/** Defesa Base = 15 + VD ÷ 2 (docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de
 * Ameaças" > "Defesa"). VD ímpar não é exemplificado no documento — arredondado para baixo,
 * mesma convenção usada nas demais fórmulas de criatura (ex.: `calcularValorModificador`). */
export function calcularDefesaBase(dto: DefesaBaseCalcularDto): number {
  return 15 + Math.floor(dto.vd / 2);
}

/** Contra-Ataque só existe quando o modificador de Luta da criatura é Forte (docs/... —
 * "Defesa" > "Contra-Ataque"). */
export function possuiContraAtaque(modificadorLuta: ModificadorCriaturaEnum): boolean {
  return modificadorLuta === ModificadorCriaturaEnum.FORTE;
}
