import { describe, expect, it } from 'vitest';
import { ModificadorCriaturaEnum } from '../../enums';
import { calcularDefesaBase, possuiContraAtaque } from './defesa';

describe('calcularDefesaBase', () => {
  it('"A Estátua": 15 + 30÷2 = 30', () => {
    expect(calcularDefesaBase({ vd: 30 })).toBe(30);
  });

  it('arredonda para baixo em VD ímpar', () => {
    expect(calcularDefesaBase({ vd: 21 })).toBe(25); // 15 + floor(21/2)=10
  });
});

describe('possuiContraAtaque', () => {
  it('só quando o modificador de Luta é Forte', () => {
    expect(possuiContraAtaque(ModificadorCriaturaEnum.FORTE)).toBe(true);
    expect(possuiContraAtaque(ModificadorCriaturaEnum.MEDIO)).toBe(false);
    expect(possuiContraAtaque(ModificadorCriaturaEnum.FRACO)).toBe(false);
    expect(possuiContraAtaque(ModificadorCriaturaEnum.FRAGIL)).toBe(false);
  });
});
