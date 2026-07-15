import { describe, expect, it } from 'vitest';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { interpretarFormula, rolarFormula, validarFormula } from './rolagem';

/**
 * Motor de rolagem (m3-15): interpretação e rolagem de fórmulas de preset. A rolagem é
 * determinística nos testes via `rolarDado` injetado. Conferido contra a notação de
 * docs/core/sistema-v4.1.0.md — "Atributos"/"Testes" (`1d20 + Atributo`).
 */

const atributos: FichaAtributosDto = {
  destreza: 2,
  forca: 6,
  luta: 3,
  pontaria: 1,
  vigor: 4,
  intelecto: 1,
  medicina: 1,
  sentidos: 2,
  social: 1,
  vontade: 3,
};

/** Rola sempre o valor máximo do dado — determinístico. */
const rolarMaximo = (faces: number): number => faces;

describe('interpretarFormula', () => {
  it('interpreta dado + atributo (`1d20+LUT`)', () => {
    const resultado = interpretarFormula('1d20+LUT');
    expect(resultado.valida).toBe(true);
    expect(resultado.formula?.dados).toEqual([{ sinal: 1, quantidade: 1, faces: 20 }]);
    expect(resultado.formula?.atributos).toEqual([{ sinal: 1, atributo: 'luta', rotulo: 'LUT' }]);
    expect(resultado.formula?.constante).toBe(0);
  });

  it('aceita espaços, N implícito, subtração e o nome completo do atributo', () => {
    const resultado = interpretarFormula(' d6 + 2d8 - forca + 3 ');
    expect(resultado.valida).toBe(true);
    expect(resultado.formula?.dados).toEqual([
      { sinal: 1, quantidade: 1, faces: 6 },
      { sinal: 1, quantidade: 2, faces: 8 },
    ]);
    expect(resultado.formula?.atributos).toEqual([{ sinal: -1, atributo: 'forca', rotulo: 'FORCA' }]);
    expect(resultado.formula?.constante).toBe(3);
  });

  it('rejeita fórmula vazia, termo desconhecido e dado inválido', () => {
    expect(interpretarFormula('').valida).toBe(false);
    expect(interpretarFormula('1d20+XYZ').valida).toBe(false);
    expect(interpretarFormula('1d0').valida).toBe(false);
    expect(interpretarFormula('2d').valida).toBe(false);
  });

  it('rejeita quantidade de dados acima do teto', () => {
    expect(interpretarFormula('101d6').valida).toBe(false);
    expect(interpretarFormula('100d6').valida).toBe(true);
  });

  it('validarFormula espelha a validade', () => {
    expect(validarFormula('1d20+LUT')).toBe(true);
    expect(validarFormula('nada')).toBe(false);
  });
});

describe('rolarFormula', () => {
  it('rola dados, soma atributo e constante (determinístico)', () => {
    // 1d20 (=20) + LUT (3) + 2 = 25.
    const resultado = rolarFormula({ formula: '1d20+LUT+2', atributos }, rolarMaximo);
    expect(resultado).not.toBeNull();
    expect(resultado?.dados).toEqual([{ sinal: 1, faces: 20, valores: [20], subtotal: 20 }]);
    expect(resultado?.atributos).toEqual([{ rotulo: 'LUT', valor: 3 }]);
    expect(resultado?.constante).toBe(2);
    expect(resultado?.total).toBe(25);
  });

  it('aplica o sinal de subtração aos dados e ao atributo', () => {
    // 2d6 (=12) − FOR (6) = 6.
    const resultado = rolarFormula({ formula: '2d6-FOR', atributos }, rolarMaximo);
    expect(resultado?.dados[0].subtotal).toBe(12);
    expect(resultado?.atributos[0].valor).toBe(-6);
    expect(resultado?.total).toBe(6);
  });

  it('devolve os valores individuais de cada dado', () => {
    let n = 0;
    const sequencia = (): number => [3, 5, 1][n++]; // 3d6 → 3,5,1
    const resultado = rolarFormula({ formula: '3d6', atributos }, sequencia);
    expect(resultado?.dados[0].valores).toEqual([3, 5, 1]);
    expect(resultado?.total).toBe(9);
  });

  it('fórmula inválida devolve null', () => {
    expect(rolarFormula({ formula: 'xyz', atributos }, rolarMaximo)).toBeNull();
  });
});
