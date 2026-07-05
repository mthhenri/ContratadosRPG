import { ClasseEnum } from '../../enums';
import { DeslocamentoCalcularDto } from './agente.dtos';

/**
 * Deslocamento do agente em metros por ação de movimento.
 *
 * Agente (doc — "Deslocamento"): Destreza ≤ 0 → 8m; Destreza 1–4 → 9m;
 * Destreza ≥ 5 → 10m. Civil (doc — "Jogando como um Civil" > "Informações
 * Adicionais"): 6m com Destreza 0–1; 7m com Destreza ≥ 2.
 */
export function calcularDeslocamento(dto: DeslocamentoCalcularDto): number {
  if (dto.classe === ClasseEnum.CIVIL) {
    return dto.destreza <= 1 ? 6 : 7;
  }
  if (dto.destreza <= 0) {
    return 8;
  }
  if (dto.destreza <= 4) {
    return 9;
  }
  return 10;
}
