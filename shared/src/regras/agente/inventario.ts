import { ClasseEnum } from '../../enums';
import { InventarioCalcularDto } from './agente.dtos';

/**
 * Inventário base (limite de peso). Força × 5 para agentes, Força × 3 para Civis.
 *
 * Força negativa resulta em 0 independente do valor (ambas as classes). A exceção
 * "Força 0 → 3 de inventário" (doc — "Inventário") vale apenas para agentes; para
 * Civis o inventário é estritamente Força × 3 (doc — "Jogando como um Civil"),
 * então Força 0 resulta em 0.
 */
export function calcularInventario(dto: InventarioCalcularDto): number {
  if (dto.forca < 0) {
    return 0;
  }
  if (dto.classe === ClasseEnum.CIVIL) {
    return dto.forca * 3;
  }
  if (dto.forca === 0) {
    return 3;
  }
  return dto.forca * 5;
}
