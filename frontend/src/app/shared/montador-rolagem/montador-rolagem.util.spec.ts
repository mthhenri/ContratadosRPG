import { describe, expect, it } from 'vitest';

import { incrementarUltimoDado } from './montador-rolagem.util';

describe('incrementarUltimoDado', () => {
  it('sem termo dessa face ainda, devolve null', () => {
    expect(incrementarUltimoDado('', 6)).toBeNull();
    expect(incrementarUltimoDado('2d10+FOR', 6)).toBeNull();
  });

  it('dado bare (sem número) vira 2, depois 3 — clique repetido soma quantidade', () => {
    let formula = incrementarUltimoDado('d6', 6);
    expect(formula).toBe('2d6');
    formula = incrementarUltimoDado(formula!, 6);
    expect(formula).toBe('3d6');
  });

  it('incrementa o termo já numérico, preservando o resto da fórmula ao redor', () => {
    expect(incrementarUltimoDado('2d6+FOR', 6)).toBe('3d6+FOR');
    expect(incrementarUltimoDado('LUTd20kh1+2d6[Físico]', 6)).toBe('LUTd20kh1+3d6[Físico]');
  });

  it('sempre o último termo daquela face, não o último token digitado', () => {
    // "d10" foi o último token clicado, mas incrementar d6 tem que achar o "2d6" mais à frente.
    expect(incrementarUltimoDado('2d6+3d10', 6)).toBe('3d6+3d10');
    // Dois termos da mesma face: sempre o último.
    expect(incrementarUltimoDado('2d6+3d6', 6)).toBe('2d6+4d6');
  });

  it('não incrementa ATRdM (atributo como fonte de dados) — insere um termo novo do lado de fora', () => {
    expect(incrementarUltimoDado('FORd6', 6)).toBeNull();
    expect(incrementarUltimoDado('2d10+FORd6', 6)).toBeNull();
  });

  it('não incrementa dentro de um bloco composto (ATR±n)dM', () => {
    expect(incrementarUltimoDado('(LUT+2)d20', 20)).toBeNull();
    expect(incrementarUltimoDado('(LUT+2)d20kh1', 20)).toBeNull();
  });

  it('não confunde d1 dentro de d10/d12 (limite de face exato)', () => {
    expect(incrementarUltimoDado('2d10', 1)).toBeNull();
    expect(incrementarUltimoDado('2d12', 1)).toBeNull();
  });

  it('preserva operadores por pool colados no termo (kh/kl/cm/!/?)', () => {
    expect(incrementarUltimoDado('3d6kh1cm1', 6)).toBe('4d6kh1cm1');
  });
});
