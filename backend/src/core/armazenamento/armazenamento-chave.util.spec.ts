import { describe, expect, it } from 'vitest';
import { construirChaveTexto } from './armazenamento-chave.util';
import { ArmazenamentoPastaEnum } from './armazenamento-provedor.interface';

describe('construirChaveTexto (pn-02)', () => {
  it.each(['1.1.0.md', 'indice.json', 'nota_a-b.md'])('monta patchnotes/%s', (nome) => {
    expect(construirChaveTexto(ArmazenamentoPastaEnum.PATCHNOTES, nome)).toBe(`patchnotes/${nome}`);
  });

  it.each([
    '',
    '../indice.json',
    'a/../b.md',
    'sub/arquivo.md',
    '..',
    '.oculto',
    'a\\b.md',
    'com espaço.md',
    'nulo\0.md',
    '%2e%2e',
  ])('recusa o nome %j', (nome) => {
    expect(() => construirChaveTexto(ArmazenamentoPastaEnum.PATCHNOTES, nome)).toThrow('inválido');
  });
});
