import { describe, expect, it } from 'vitest';
import { calcularBonusIniciativaSugerido } from './cadencia';

describe('calcularBonusIniciativaSugerido', () => {
  it('≈10% do VD, arredondado para baixo — exemplo do próprio doc: VD 37 → +3', () => {
    expect(calcularBonusIniciativaSugerido({ vd: 37 })).toBe(3);
  });

  it('VD 30 → +3', () => {
    expect(calcularBonusIniciativaSugerido({ vd: 30 })).toBe(3);
  });

  it('VD 5 → +0', () => {
    expect(calcularBonusIniciativaSugerido({ vd: 5 })).toBe(0);
  });
});
