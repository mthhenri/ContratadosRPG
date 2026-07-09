import { describe, expect, it } from 'vitest';

import { MAESTRIA_PONTOS_MINIMO, maestriaAtingivel, maestriaValida } from './maestria';

/**
 * Prova a regra de Maestria (sistema-v4.1.0.md — "⬥ Maestrias"), m3-10: só marcável em atributo
 * com 6+ pontos; `null` (sem Maestria) é sempre válido; a unicidade vem do campo único.
 */
describe('maestria', () => {
  it('exige 6 pontos como mínimo (constante do documento)', () => {
    expect(MAESTRIA_PONTOS_MINIMO).toBe(6);
    expect(maestriaAtingivel(5)).toBe(false);
    expect(maestriaAtingivel(6)).toBe(true);
    expect(maestriaAtingivel(8)).toBe(true);
  });

  it('null (sem Maestria) é sempre válido', () => {
    expect(maestriaValida({ forca: 3 }, null)).toBe(true);
  });

  it('valida a Maestria só quando o atributo indicado tem 6+', () => {
    expect(maestriaValida({ forca: 6, destreza: 2 }, 'forca')).toBe(true);
    expect(maestriaValida({ forca: 5, destreza: 2 }, 'forca')).toBe(false);
  });

  it('rejeita Maestria em atributo inexistente', () => {
    expect(maestriaValida({ forca: 6 }, 'inexistente')).toBe(false);
  });
});
