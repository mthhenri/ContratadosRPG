import { describe, expect, it } from 'vitest';

import { limitarGeometria } from './leitor-documentos.util';

describe('limitarGeometria', () => {
  it('aplica mínimos e mantém toda a janela alcançável no viewport', () => {
    expect(
      limitarGeometria(
        { x: -900, y: 9999, largura: 100, altura: 100 },
        { largura: 1920, altura: 1080 },
      ),
    ).toEqual({ x: 0, y: 600, largura: 640, altura: 480 });
  });

  it('permite posicionar a janela desde o topo do viewport', () => {
    expect(
      limitarGeometria(
        { x: 40, y: -30, largura: 700, altura: 500 },
        { largura: 1200, altura: 900 },
      ),
    ).toEqual({ x: 40, y: 0, largura: 700, altura: 500 });
  });

  it('ocupa o espaço disponível quando o viewport é menor que os mínimos', () => {
    expect(
      limitarGeometria(
        { x: 100, y: 100, largura: 900, altura: 900 },
        { largura: 360, altura: 800 },
      ),
    ).toEqual({ x: 0, y: 0, largura: 360, altura: 800 });
  });
});
