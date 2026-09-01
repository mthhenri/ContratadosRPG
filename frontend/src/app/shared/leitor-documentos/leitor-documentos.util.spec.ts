import { describe, expect, it } from 'vitest';

import { limitarTamanho } from './leitor-documentos.util';

describe('limitarTamanho', () => {
  it('aplica mínimos e mantém o tamanho dentro do viewport', () => {
    expect(limitarTamanho({ largura: 100, altura: 100 }, { largura: 1920, altura: 1080 })).toEqual(
      { largura: 640, altura: 480 },
    );
  });

  it('preserva um tamanho já dentro dos mínimos', () => {
    expect(limitarTamanho({ largura: 700, altura: 500 }, { largura: 1200, altura: 900 })).toEqual({
      largura: 700,
      altura: 500,
    });
  });

  it('ocupa o espaço disponível quando o viewport é menor que os mínimos', () => {
    expect(limitarTamanho({ largura: 900, altura: 900 }, { largura: 360, altura: 800 })).toEqual({
      largura: 360,
      altura: 800,
    });
  });
});
