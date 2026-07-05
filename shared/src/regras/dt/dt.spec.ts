import { describe, expect, it } from 'vitest';
import { calcularDtAtributo } from './dt';

/**
 * DT de atributo conferida contra docs/core/sistema-v4.1.0.md — "DTs de
 * Atributos": DT = 10 + Nível + (Atributo × 2). Os valores de referência batem
 * com a tabela (Atributo 1–6 × Nível 0/5/10/15/20) exibida por `calcDT` no site
 * antigo.
 */
describe('calcularDtAtributo', () => {
  it('Nível 0, Atributo 0: DT base 10', () => {
    expect(calcularDtAtributo({ nivel: 0, atributo: 0 })).toBe(10);
  });

  it('soma Nível e o dobro do Atributo', () => {
    // 10 + 0 + 1×2
    expect(calcularDtAtributo({ nivel: 0, atributo: 1 })).toBe(12);
    // 10 + 5 + 3×2
    expect(calcularDtAtributo({ nivel: 5, atributo: 3 })).toBe(21);
    // 10 + 20 + 6×2
    expect(calcularDtAtributo({ nivel: 20, atributo: 6 })).toBe(42);
  });

  it('confere a tabela de referência do site (Atributo 1..6 no Nível 10)', () => {
    const nivel = 10;
    expect([1, 2, 3, 4, 5, 6].map((atributo) => calcularDtAtributo({ nivel, atributo }))).toEqual([
      22, 24, 26, 28, 30, 32,
    ]);
  });

  it('aceita atributo negativo (sem clamp — normalização é responsabilidade da aplicação)', () => {
    // 10 + 3 + (-5)×2
    expect(calcularDtAtributo({ nivel: 3, atributo: -5 })).toBe(3);
  });
});
