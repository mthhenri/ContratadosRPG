import { describe, expect, it } from 'vitest';
import { compararVersoesPatchnote, ehVersaoPatchnoteValida } from './patchnote.validators';

describe('ehVersaoPatchnoteValida', () => {
  it.each(['1.0.0', '1.1.0', '10.20.300', '0.0.1'])('aceita %s', (versao) => {
    expect(ehVersaoPatchnoteValida(versao)).toBe(true);
  });

  it.each(['', '1.0', '1.0.0.0', 'v1.0.0', '1.0.0-beta', '1.0.x', '../1.0.0', '1.0.0\n', ' 1.0.0', '١.٠.٠'])(
    'recusa %j',
    (versao) => {
      expect(ehVersaoPatchnoteValida(versao)).toBe(false);
    },
  );
});

describe('compararVersoesPatchnote', () => {
  it('compara numericamente, não por texto', () => {
    expect(compararVersoesPatchnote('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compararVersoesPatchnote('2.0.0', '10.0.0')).toBeLessThan(0);
  });

  it('desempata por minor e patch e reconhece igualdade', () => {
    expect(compararVersoesPatchnote('1.1.0', '1.0.9')).toBeGreaterThan(0);
    expect(compararVersoesPatchnote('1.0.1', '1.0.2')).toBeLessThan(0);
    expect(compararVersoesPatchnote('1.1.0', '1.1.0')).toBe(0);
  });

  it('ordena do mais novo para o mais antigo', () => {
    expect(['1.0.0', '1.10.0', '1.2.0', '2.0.0'].sort((a, b) => compararVersoesPatchnote(b, a))).toEqual([
      '2.0.0',
      '1.10.0',
      '1.2.0',
      '1.0.0',
    ]);
  });
});
