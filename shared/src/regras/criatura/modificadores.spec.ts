import { describe, expect, it } from 'vitest';
import { ModificadorCriaturaEnum } from '../../enums';
import { calcularAtributoEfetivo, calcularValorModificador } from './modificadores';

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

describe('calcularAtributoEfetivo', () => {
  it('soma o Atributo Final ao valor do Modificador', () => {
    expect(calcularAtributoEfetivo({ atributoFinal: 5, modificador: ModificadorCriaturaEnum.FORTE, vd: 30 })).toBe(17);
  });
});
