import { TenacidadeEnum } from '../../enums';
import type { VidaMaximaCalcularDto } from './criatura.dtos';

/** Multiplicador de Vida Máxima por Tenacidade (docs/core/guia_de_mestre-v4.0.0.md — "Guia de
 * Criação de Ameaças" > "Saúde"). Absoluta é "×120 ou mais" no documento — o motor usa o valor
 * de referência (120); qualquer ajuste acima disso é edição manual pós-criação (mesma
 * filosofia snapshot+editável de m3-10). */
const MULTIPLICADOR_TENACIDADE: Readonly<Record<TenacidadeEnum, number>> = {
  [TenacidadeEnum.DESCARTAVEL]: 10,
  [TenacidadeEnum.FRAGIL]: 25,
  [TenacidadeEnum.PADRAO]: 35,
  [TenacidadeEnum.ROBUSTA]: 55,
  [TenacidadeEnum.RESISTENTE]: 75,
  [TenacidadeEnum.IMPLACAVEL]: 100,
  [TenacidadeEnum.ABSOLUTA]: 120,
};

/** Vida Máxima = VD × Multiplicador da Tenacidade. */
export function calcularVidaMaxima(dto: VidaMaximaCalcularDto): number {
  return dto.vd * MULTIPLICADOR_TENACIDADE[dto.tenacidade];
}
