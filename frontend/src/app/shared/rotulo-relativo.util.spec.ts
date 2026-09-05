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

  it('devolve horas entre 1h e 24h', () => {
    expect(rotuloRelativo(0, 60 * 60000)).toBe('há 1 h');
    expect(rotuloRelativo(0, 5 * 60 * 60000)).toBe('há 5 h');
    expect(rotuloRelativo(0, 23 * 60 * 60000)).toBe('há 23 h');
  });

  it('devolve dias entre 1 e 6 dias, com singular/plural', () => {
    expect(rotuloRelativo(0, 24 * 3600000)).toBe('há 1 dia');
    expect(rotuloRelativo(0, 6 * 24 * 3600000)).toBe('há 6 dias');
  });

  it('devolve semanas entre 7 e 29 dias, com singular/plural', () => {
    expect(rotuloRelativo(0, 7 * 24 * 3600000)).toBe('há 1 semana');
    expect(rotuloRelativo(0, 29 * 24 * 3600000)).toBe('há 4 semanas');
  });

  it('devolve meses entre 30 e 364 dias, com singular/plural', () => {
    expect(rotuloRelativo(0, 30 * 24 * 3600000)).toBe('há 1 mês');
    expect(rotuloRelativo(0, 364 * 24 * 3600000)).toBe('há 12 meses');
  });

  it('devolve anos a partir de 365 dias, com singular/plural', () => {
    expect(rotuloRelativo(0, 365 * 24 * 3600000)).toBe('há 1 ano');
    expect(rotuloRelativo(0, 800 * 24 * 3600000)).toBe('há 2 anos');
  });

  it('nunca fica negativo quando o relógio local está levemente atrasado', () => {
    expect(rotuloRelativo(1000, 500)).toBe('agora');
  });
});
