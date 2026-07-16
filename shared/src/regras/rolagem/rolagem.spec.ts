import { describe, expect, it } from 'vitest';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { RolagemModoEnum, TipoDanoEnum } from '../../enums';
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

describe('gramática v2 — atributo-como-dado e escalonamento (m3-16)', () => {
  it('interpreta atributo como fonte de dados (`FORd6`, `lutad20`)', () => {
    expect(interpretarFormula('FORd6').formula?.dados).toEqual([
      { sinal: 1, quantidade: 1, faces: 6, quantidadeAtributo: 'forca' },
    ]);
    expect(interpretarFormula('lutad20').formula?.dados).toEqual([
      { sinal: 1, quantidade: 1, faces: 20, quantidadeAtributo: 'luta' },
    ]);
  });

  it('interpreta escalonamento de atributo (`FOR*3`, `LUT/2`)', () => {
    expect(interpretarFormula('FOR*3').formula?.atributos).toEqual([
      { sinal: 1, atributo: 'forca', rotulo: 'FOR*3', multiplicador: 3 },
    ]);
    expect(interpretarFormula('LUT/2').formula?.atributos).toEqual([
      { sinal: 1, atributo: 'luta', rotulo: 'LUT/2', divisor: 2 },
    ]);
  });

  it('rejeita divisor zero e parênteses', () => {
    expect(interpretarFormula('FOR/0').valida).toBe(false);
    expect(interpretarFormula('(1d20)').valida).toBe(false);
    expect(interpretarFormula('1d20)').valida).toBe(false);
  });

  it('rola (Atributo) dados — `FORd6` com FOR=6 → 6 dados', () => {
    // 6 dados de 6 faces, cada um no máximo (=6) → 36.
    const resultado = rolarFormula({ formula: 'FORd6', atributos }, rolarMaximo);
    expect(resultado?.dados[0].valores).toHaveLength(6);
    expect(resultado?.dados[0].subtotal).toBe(36);
    expect(resultado?.total).toBe(36);
  });

  it('atributo ≤ 0 como fonte de dados → 0 dados', () => {
    const semDestreza: FichaAtributosDto = { ...atributos, destreza: 0 };
    const resultado = rolarFormula({ formula: 'DESd20', atributos: semDestreza }, rolarMaximo);
    expect(resultado?.dados[0].valores).toEqual([]);
    expect(resultado?.dados[0].subtotal).toBe(0);
    expect(resultado?.total).toBe(0);
  });

  it('aplica multiplicador e divisor (piso) ao atributo', () => {
    // FOR=6 → ×3 = 18.
    expect(rolarFormula({ formula: 'FOR*3', atributos }, rolarMaximo)?.total).toBe(18);
    // LUT=3 → /2 = floor(1.5) = 1.
    expect(rolarFormula({ formula: 'LUT/2', atributos }, rolarMaximo)?.total).toBe(1);
  });
});

describe('dano tipado e Composto (m3-18)', () => {
  it('estampa o tipo de dano nos termos (`2d8 [Balístico]`)', () => {
    expect(interpretarFormula('2d8 [Balístico]').formula?.dados).toEqual([
      { sinal: 1, quantidade: 2, faces: 8, tipoDano: TipoDanoEnum.BALISTICO },
    ]);
  });

  it('agrupa o total por tipo de dano', () => {
    // 1d6 (=6) + FOR (6) = 12 Físico; 2d4 (=8) Explosão.
    const resultado = rolarFormula(
      { formula: '1d6+FOR [Físico] + 2d4 [Explosão]', atributos },
      rolarMaximo,
    );
    expect(resultado?.grupos).toEqual([
      { tipoDano: TipoDanoEnum.FISICO, total: 12 },
      { tipoDano: TipoDanoEnum.EXPLOSAO, total: 8 },
    ]);
    expect(resultado?.total).toBe(20);
  });

  it('trecho sem tag numa fórmula tipada assume Físico', () => {
    // 2d6 (=12) Explosão + 3 (sem tag) → Físico.
    const resultado = rolarFormula({ formula: '2d6 [Explosão] + 3', atributos }, rolarMaximo);
    expect(resultado?.grupos).toEqual([
      { tipoDano: TipoDanoEnum.EXPLOSAO, total: 12 },
      { tipoDano: TipoDanoEnum.FISICO, total: 3 },
    ]);
    expect(resultado?.total).toBe(15);
  });

  it('Composto divide a soma do segmento 50/50, resto pro primeiro', () => {
    let n = 0;
    const sequencia = (): number => [10, 5][n++]; // 2d10 → 15
    const resultado = rolarFormula({ formula: '2d10 [Físico-Químico]', atributos }, sequencia);
    expect(resultado?.grupos).toEqual([
      { tipoDano: TipoDanoEnum.FISICO, total: 8, composto: true },
      { tipoDano: TipoDanoEnum.QUIMICO, total: 7, composto: true },
    ]);
    expect(resultado?.total).toBe(15);
  });

  it('resolve tags tolerando caixa e acentos (`[quimico]`)', () => {
    expect(interpretarFormula('2d6 [quimico]').formula?.dados[0].tipoDano).toBe(TipoDanoEnum.QUIMICO);
  });

  it('rejeita tipo desconhecido, Composto com Geral, 3 tipos e tipos iguais', () => {
    expect(interpretarFormula('2d6 [Xyz]').valida).toBe(false);
    expect(interpretarFormula('2d6 [Físico-Geral]').valida).toBe(false);
    expect(interpretarFormula('2d6 [Físico-Químico-Balístico]').valida).toBe(false);
    expect(interpretarFormula('2d6 [Físico-Físico]').valida).toBe(false);
  });

  it('rejeita tag sem termos antes e tag malformada', () => {
    expect(interpretarFormula('[Físico]2d6').valida).toBe(false);
    expect(interpretarFormula('2d6[Físico').valida).toBe(false);
  });

  it('fórmula sem tags não gera grupos (regressão)', () => {
    const resultado = rolarFormula({ formula: '2d6+FOR', atributos }, rolarMaximo);
    expect(resultado?.grupos).toBeUndefined();
    expect(resultado?.total).toBe(18); // 2d6 (=12) + FOR (6)
  });

  it('TipoDanoEnum tem os valores de exibição do documento', () => {
    expect(TipoDanoEnum.FISICO).toBe('Físico');
    expect(TipoDanoEnum.BALISTICO).toBe('Balístico');
  });
});

describe('modo TESTE — pegar o maior + proficiência (m3-19)', () => {
  it('açúcar: atributo puro vira o pool `(Atributo)`D20 no modo TESTE', () => {
    const formula = interpretarFormula('luta', RolagemModoEnum.TESTE).formula;
    expect(formula?.dados).toEqual([{ sinal: 1, quantidade: 1, quantidadeAtributo: 'luta', faces: 20 }]);
    expect(formula?.atributos).toEqual([]);
  });

  it('sem TESTE, o atributo puro continua modificador (regressão)', () => {
    const formula = interpretarFormula('luta').formula;
    expect(formula?.atributos).toEqual([{ sinal: 1, atributo: 'luta', rotulo: 'LUTA' }]);
    expect(formula?.dados).toEqual([]);
  });

  it('pega o maior dado do pool e soma a Proficiência', () => {
    let n = 0;
    const sequencia = (): number => [5, 18, 9][n++]; // luta=3 → 3 D20
    const resultado = rolarFormula(
      { formula: 'lutad20', atributos, modo: RolagemModoEnum.TESTE, proficiencia: 2 },
      sequencia,
    );
    expect(resultado?.teste).toEqual({
      pool: [5, 18, 9],
      maiorDado: 18,
      descartados: [5, 9],
      proficiencia: 2,
      bonusPlano: 0,
      total: 20,
    });
    expect(resultado?.total).toBe(20);
  });

  it('o açúcar `luta` rola igual a `lutad20`', () => {
    let n = 0;
    const sequencia = (): number => [5, 18, 9][n++];
    const resultado = rolarFormula(
      { formula: 'luta', atributos, modo: RolagemModoEnum.TESTE, proficiencia: 2 },
      sequencia,
    );
    expect(resultado?.teste?.maiorDado).toBe(18);
    expect(resultado?.total).toBe(20);
  });

  it('Proficiência nula (Civil) conta como 0', () => {
    // luta=3 → 3 D20, todos no máximo (20) → maior 20.
    const resultado = rolarFormula(
      { formula: 'lutad20', atributos, modo: RolagemModoEnum.TESTE, proficiencia: null },
      rolarMaximo,
    );
    expect(resultado?.teste?.proficiencia).toBe(0);
    expect(resultado?.total).toBe(20);
  });

  it('soma bônus plano (constante) ao teste', () => {
    let n = 0;
    const sequencia = (): number => [10, 15][n++]; // luta=2 → 2 D20
    const comLutaDois: FichaAtributosDto = { ...atributos, luta: 2 };
    const resultado = rolarFormula(
      { formula: 'lutad20 + 2', atributos: comLutaDois, modo: RolagemModoEnum.TESTE, proficiencia: 1 },
      sequencia,
    );
    expect(resultado?.teste?.maiorDado).toBe(15);
    expect(resultado?.teste?.bonusPlano).toBe(2);
    expect(resultado?.total).toBe(18); // 15 + 1 (prof) + 2
  });

  it('modo SOMA não produz `teste` (regressão)', () => {
    const resultado = rolarFormula({ formula: 'luta', atributos }, rolarMaximo);
    expect(resultado?.teste).toBeUndefined();
    expect(resultado?.total).toBe(3); // luta como modificador
  });
});
