import { describe, expect, it } from 'vitest';
import { RegeneracaoIntensidadeEnum, RegeneracaoModoEnum } from '../../enums';
import { calcularValorRegeneracao } from './regeneracao';

describe('calcularValorRegeneracao', () => {
  it('Passiva: % direto da tabela de Intensidades', () => {
    expect(
      calcularValorRegeneracao({
        vidaMaxima: 1000,
        intensidade: RegeneracaoIntensidadeEnum.RESIDUAL,
        modo: RegeneracaoModoEnum.PASSIVA,
      }),
    ).toBe(50);
    expect(
      calcularValorRegeneracao({
        vidaMaxima: 1000,
        intensidade: RegeneracaoIntensidadeEnum.IMPARAVEL,
        modo: RegeneracaoModoEnum.PASSIVA,
      }),
    ).toBe(350);
  });

  it('Condicional: percentual maior que a Passiva equivalente', () => {
    expect(
      calcularValorRegeneracao({
        vidaMaxima: 1000,
        intensidade: RegeneracaoIntensidadeEnum.RESIDUAL,
        modo: RegeneracaoModoEnum.CONDICIONAL,
      }),
    ).toBe(200);
    expect(
      calcularValorRegeneracao({
        vidaMaxima: 1000,
        intensidade: RegeneracaoIntensidadeEnum.IMPARAVEL,
        modo: RegeneracaoModoEnum.CONDICIONAL,
      }),
    ).toBe(500);
  });

  it('arredonda para baixo', () => {
    expect(
      calcularValorRegeneracao({
        vidaMaxima: 33,
        intensidade: RegeneracaoIntensidadeEnum.MODERADA,
        modo: RegeneracaoModoEnum.PASSIVA,
      }),
    ).toBe(3); // 33 × 0,10 = 3,3 → 3
  });
});
