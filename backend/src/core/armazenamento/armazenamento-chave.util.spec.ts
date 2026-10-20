import { describe, expect, it } from 'vitest';
import { construirChaveTexto, recuperarChaveImagem } from './armazenamento-chave.util';
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

describe('chaves de imagem', () => {
  it.each(['/uploads/agentes/dev/seed.png', '/uploads/fichas/avatar.webp', '/uploads/documentos/nota.jpg'])(
    'aceita somente referência de imagem normalizada: %s', caminho => {
      expect(recuperarChaveImagem(caminho)).toBe(caminho.slice('/uploads/'.length));
    },
  );
  it.each([
    '/uploads/agentes/../secreto.png', '/uploads/agentes/a/../../secreto.png',
    '/uploads/agentes/%2e%2e/a.png', '/uploads/agentes/a%2fb.png', '/uploads/agentes/a\\b.png',
    '/uploads/fichas/a.png?token=x', '/uploads/fichas/sub/a.png', '/uploads/fichas/a.svg',
    'C:\\secreto.png', 'https://outro.test/agentes/a.png', '/uploads/agentes/a..png',
  ])('recusa traversal, origem ou formato impróprio: %s', caminho => {
    expect(() => recuperarChaveImagem(caminho, 'https://dominio-proprio.test')).toThrow('inválido');
  });
});
