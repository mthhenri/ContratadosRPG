import { describe, expect, it } from 'vitest';
import { obterBaseELimitePorVd, validarRealocacaoAtributos } from './atributos';

/**
 * Base/Limite/Pontos de Ajuste conferidos contra docs/core/guia_de_mestre-v4.0.0.md — "Guia
 * de Criação de Ameaças" > "Atributos" > "Base, Limite e Pontos de Ajuste".
 */
describe('obterBaseELimitePorVd', () => {
  it('VD 0–20: Base 1, Limite 4', () => {
    expect(obterBaseELimitePorVd({ vd: 20 })).toEqual({ base: 1, limite: 4, pontosAjuste: 4 });
  });

  it('VD 20–40 ("A Estátua", VD 30): Base 2, Limite 5, 6 Pontos de Ajuste', () => {
    expect(obterBaseELimitePorVd({ vd: 30 })).toEqual({ base: 2, limite: 5, pontosAjuste: 6 });
  });

  it('VD 40–60: Base 3, Limite 6', () => {
    expect(obterBaseELimitePorVd({ vd: 45 })).toEqual({ base: 3, limite: 6, pontosAjuste: 9 });
  });

  it('VD 60–80: Base 4, Limite 7', () => {
    expect(obterBaseELimitePorVd({ vd: 70 })).toEqual({ base: 4, limite: 7, pontosAjuste: 14 });
  });

  it('VD 80–100: Base 5, Limite 9 (exceção — não é Base + 3)', () => {
    expect(obterBaseELimitePorVd({ vd: 90 })).toEqual({ base: 5, limite: 9, pontosAjuste: 18 });
  });

  it('VD acima de 100: Base 5, Limite 10 (exceção — não é Base + 3)', () => {
    expect(obterBaseELimitePorVd({ vd: 120 })).toEqual({ base: 5, limite: 10, pontosAjuste: 24 });
  });

  it('Pontos de Ajuste = VD ÷ 5 arredondado para baixo', () => {
    expect(obterBaseELimitePorVd({ vd: 33 }).pontosAjuste).toBe(6);
  });
});

describe('validarRealocacaoAtributos', () => {
  const atributosBase = {
    destreza: 0, forca: 0, luta: 0, pontaria: 0, vigor: 0,
    intelecto: 0, medicina: 0, sentidos: 0, social: 0, vontade: 0,
  };

  it('sem violações quando todos os atributos estão dentro de [0, limite]', () => {
    expect(
      validarRealocacaoAtributos({
        atributosFinal: { ...atributosBase, forca: 3, destreza: 4, luta: 5, pontaria: 2, vigor: 3, sentidos: 3 },
        limite: 5,
      }),
    ).toEqual([]);
  });

  it('acusa atributo acima do limite', () => {
    expect(validarRealocacaoAtributos({ atributosFinal: { ...atributosBase, forca: 6 }, limite: 5 })).toEqual([
      'forca: valor acima do limite (5)',
    ]);
  });

  it('acusa atributo negativo (Realocação pode zerar, não negativar)', () => {
    expect(validarRealocacaoAtributos({ atributosFinal: { ...atributosBase, social: -1 }, limite: 5 })).toEqual([
      'social: valor abaixo de 0',
    ]);
  });
});
