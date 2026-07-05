import { AreaPercepcaoCalcularDto } from './agente.dtos';

/**
 * Área de Percepção do agente em metros: espaço no qual ele nota o que acontece
 * (e tem chance de detectar seres furtivos). Vale para todas as classes.
 *
 * 5 + Sentidos × 5. Sem Sentidos (0 ou menos), a área é apenas 3 metros.
 * Fonte: docs/core/sistema-v4.1.0.md — "Área de Percepção".
 */
export function calcularAreaPercepcao(dto: AreaPercepcaoCalcularDto): number {
  if (dto.sentidos <= 0) {
    return 3;
  }
  return 5 + dto.sentidos * 5;
}
