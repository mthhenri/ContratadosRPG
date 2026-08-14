import { describe, expect, it } from 'vitest';
import { TenacidadeEnum } from '../../enums';
import { calcularVidaMaxima } from './saude';

describe('calcularVidaMaxima', () => {
  it('"A Estátua": VD 30 × Tenacidade Padrão (×35) = 1.050', () => {
    expect(calcularVidaMaxima({ vd: 30, tenacidade: TenacidadeEnum.PADRAO })).toBe(1050);
  });

  it('multiplicador das sete Tenacidades', () => {
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.DESCARTAVEL })).toBe(100);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.FRAGIL })).toBe(250);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.PADRAO })).toBe(350);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.ROBUSTA })).toBe(550);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.RESISTENTE })).toBe(750);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.IMPLACAVEL })).toBe(1000);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.ABSOLUTA })).toBe(1200);
  });
});
