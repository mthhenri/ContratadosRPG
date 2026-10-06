import { describe, expect, it } from 'vitest';
import { ModificadorCriaturaEnum } from '../../enums';
import { calcularDtAtributoCriatura, calcularValorModificador } from './modificadores';

describe('calcularValorModificador', () => {
  it('valores base em VD 5', () => {
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FORTE, vd: 5 })).toBe(0);
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.MEDIO, vd: 5 })).toBe(-1);
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FRACO, vd: 5 })).toBe(-2);
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FRAGIL, vd: 5 })).toBe(-3);
  });

  it('VD 30: bate com Forte/Médio/Frágil de "A Estátua"; Fraco diverge do exemplo (ver nota do módulo)', () => {
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FORTE, vd: 30 })).toBe(12); // doc: +12
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.MEDIO, vd: 30 })).toBe(9); // doc: +9
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FRAGIL, vd: 30 })).toBe(2); // doc: +2
    // doc mostra "+6" para Fraco na Estátua; a fórmula geral dá -2 + 5×1,5 = 5,5 → 5.
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FRACO, vd: 30 })).toBe(5);
  });

  it('arredonda valores não-inteiros para baixo', () => {
    expect(calcularValorModificador({ tipo: ModificadorCriaturaEnum.FORTE, vd: 10 })).toBe(2); // 0 + 1×2,5 = 2,5 → 2
  });
});

/** Guia v4.2.0 > DTs: valores não inteiros da metade são aproximados em direção a zero. */
describe('calcularDtAtributoCriatura', () => {
  it.each([
    [5, ModificadorCriaturaEnum.FORTE, 30, 21],
    [2, ModificadorCriaturaEnum.FRAGIL, 5, 11],
    [3, ModificadorCriaturaEnum.MEDIO, 30, 17],
    [2, ModificadorCriaturaEnum.MEDIO, 5, 12],
    [0, ModificadorCriaturaEnum.FORTE, 5, 10],
    [-1, ModificadorCriaturaEnum.FRAGIL, 5, 8],
  ])('atributo %i, modificador %s, VD %i → DT %i', (atributo, modificador, vd, esperado) => {
    expect(calcularDtAtributoCriatura({ atributo, modificador, vd })).toBe(esperado);
  });
});
