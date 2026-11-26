import { TenacidadeEnum } from '../../enums';
import type {
  CriaturaVitalidadeRecalculadaDto,
  CriaturaVitalidadeRecalcularDto,
  VidaMaximaCalcularDto,
} from './criatura.dtos';
import { calcularDefesaBase } from './defesa';

/** Multiplicador de Vida Máxima por Tenacidade (docs/core/guia_de_mestre-v4.2.0.md — "Guia de
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

/**
 * Vida e Defesa de uma criatura já criada depois de mudar VD ou Tenacidade (decisão do autor,
 * 2026-11-26, `criatura-npc-vd-habilidades-ataques`): Vida Máxima e Defesa voltam à fórmula do guia
 * ("Saúde" e "Defesa"), sobrescrevendo ajuste manual anterior; a Vida atual anda a mesma diferença
 * da máxima — a criatura com 1.000 de 1.650 que sobe para 2.475 fica com 1.825. Nunca abaixo de
 * 0 (o backend recusa Vida negativa); sem teto, porque a Vida atual pode exceder a máxima (m3-10).
 */
export function recalcularVitalidadeCriatura(
  dto: CriaturaVitalidadeRecalcularDto,
): CriaturaVitalidadeRecalculadaDto {
  const vidaMaxima = calcularVidaMaxima({ vd: dto.vd, tenacidade: dto.tenacidade });
  return {
    vidaMaxima,
    vidaAtual: Math.max(0, dto.vidaAtual + vidaMaxima - dto.vidaMaxima),
    defesa: calcularDefesaBase({ vd: dto.vd }),
  };
}
