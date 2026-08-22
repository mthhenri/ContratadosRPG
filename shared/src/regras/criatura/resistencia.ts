import { TipoDanoEnum } from '../../enums';
import type { FichaCriaturaResistenciaDto } from '../../dtos/ficha';
import type { CustoResistenciaCalcularDto, FraquezaValidarDto, LimiteResistenciasCalcularDto } from './criatura.dtos';

/** Limite de Resistências = 2×VD, +25% por Fraqueza declarada além da 1ª
 * (docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de Ameaças" > "Resistências e
 * Fraquezas" > "Limite de Resistências" / "Múltiplas Fraquezas"). */
export function calcularLimiteResistencias(dto: LimiteResistenciasCalcularDto): number {
  return Math.floor(2 * dto.vd * (1 + 0.25 * dto.quantidadeFraquezasExtras));
}

/** Custo, em pontos do Limite de Resistências, de uma resistência declarada: Dano Geral conta
 * em dobro; um subtipo conta pela metade (2 pontos gastam 1 do limite) — docs/... "Limite de
 * Resistências". As duas regras são independentes e combinam (uma resistência a um subtipo de
 * Geral, se existisse, aplicaria as duas). */
export function calcularCustoResistencia(dto: CustoResistenciaCalcularDto): number {
  let custo = dto.valor;
  if (dto.ehSubtipo) custo = Math.floor(custo / 2);
  if (dto.tipo === TipoDanoEnum.GERAL) custo *= 2;
  return custo;
}

/** Valor mínimo de uma Fraqueza é 5 ou metade da soma de todas as resistências da criatura, o
 * que for maior (docs/... "Fraquezas"). */
export function validarFraqueza(dto: FraquezaValidarDto): boolean {
  return dto.valor >= Math.max(5, dto.somaResistencias / 2);
}

/** Multiplicador de crítico quando o ataque acerta a Fraqueza: 3× para tipo amplo, 4× para
 * subtipo (docs/... "Crítico em Fraquezas"). */
export function calcularMultiplicadorCriticoFraqueza(ehSubtipo: boolean): number {
  return ehSubtipo ? 4 : 3;
}

/** Soma `resistencias` da criatura por `tipo` (`subtipo` não distingue aqui — é o mesmo total
 * "quanto esse tipo reduz" que o mestre já vê na lista); tipo sem linha fica ausente do mapa. */
export function somarResistenciasCriaturaPorTipo(
  resistencias: readonly FichaCriaturaResistenciaDto[],
): Partial<Record<TipoDanoEnum, number>> {
  const somaPorTipo: Partial<Record<TipoDanoEnum, number>> = {};
  for (const linha of resistencias) {
    somaPorTipo[linha.tipo] = (somaPorTipo[linha.tipo] ?? 0) + linha.valor;
  }
  return somaPorTipo;
}
