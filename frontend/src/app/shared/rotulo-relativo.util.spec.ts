import { describe, expect, it } from 'vitest';

import { rotuloRelativo } from './rotulo-relativo.util';

describe('rotuloRelativo', () => {
  it('devolve "agora" para menos de 5s', () => {
    expect(rotuloRelativo(1000, 1000)).toBe('agora');
    expect(rotuloRelativo(1000, 4999)).toBe('agora');
  });

  it('devolve segundos entre 5s e 1min', () => {
    expect(rotuloRelativo(0, 5000)).toBe('há 5s');
    expect(rotuloRelativo(0, 59000)).toBe('há 59s');
  });

  it('devolve minutos entre 1min e 1h', () => {
    expect(rotuloRelativo(0, 60000)).toBe('há 1 min');
    expect(rotuloRelativo(0, 59 * 60000)).toBe('há 59 min');
  });

  it('devolve horas a partir de 1h', () => {
    expect(rotuloRelativo(0, 60 * 60000)).toBe('há 1 h');
    expect(rotuloRelativo(0, 5 * 60 * 60000)).toBe('há 5 h');
  });

  it('nunca fica negativo quando o relógio local está levemente atrasado', () => {
    expect(rotuloRelativo(1000, 500)).toBe('agora');
  });
});
