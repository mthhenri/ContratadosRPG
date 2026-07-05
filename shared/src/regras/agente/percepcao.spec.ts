import { describe, expect, it } from 'vitest';
import { calcularAreaPercepcao } from './percepcao';

/**
 * Área de Percepção (em metros) conferida contra docs/core/sistema-v4.1.0.md —
 * "Área de Percepção": 5 + Sentidos × 5; Sentidos ≤ 0 vira 3 metros.
 */
describe('calcularAreaPercepcao', () => {
  it('5 + Sentidos × 5', () => {
    expect(calcularAreaPercepcao({ sentidos: 3 })).toBe(20);
    expect(calcularAreaPercepcao({ sentidos: 1 })).toBe(10);
  });

  it('Sentidos ≤ 0 → 3 metros', () => {
    expect(calcularAreaPercepcao({ sentidos: 0 })).toBe(3);
    expect(calcularAreaPercepcao({ sentidos: -4 })).toBe(3);
  });
});
