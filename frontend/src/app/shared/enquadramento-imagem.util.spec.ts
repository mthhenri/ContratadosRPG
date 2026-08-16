import { describe, expect, it } from 'vitest';

import { deslocarPan, escalaMinimaPorEixo, estiloTransformEnquadramento, limitar } from './enquadramento-imagem.util';

describe('escalaMinimaPorEixo', () => {
  it('sem proporção de imagem conhecida (ainda não carregou), devolve 1 nos dois eixos', () => {
    expect(escalaMinimaPorEixo(null, { largura: 100, altura: 100 })).toEqual({ x: 1, y: 1 });
  });

  it('imagem com a mesma proporção da caixa (as duas quadradas), sem folga em eixo nenhum', () => {
    expect(escalaMinimaPorEixo({ largura: 300, altura: 300 }, { largura: 100, altura: 100 })).toEqual({ x: 1, y: 1 });
  });

  it('imagem mais larga que a caixa (paisagem numa caixa quadrada), folga só no eixo x', () => {
    // 200×100 é o dobro da largura, proporcionalmente à caixa 100×100 — cover encaixa a altura
    // exata e sobra o dobro na largura.
    expect(escalaMinimaPorEixo({ largura: 200, altura: 100 }, { largura: 100, altura: 100 })).toEqual({ x: 2, y: 1 });
  });

  it('imagem mais alta que a caixa (retrato numa caixa quadrada), folga só no eixo y', () => {
    expect(escalaMinimaPorEixo({ largura: 100, altura: 200 }, { largura: 100, altura: 100 })).toEqual({ x: 1, y: 2 });
  });

  it('proporção inválida (altura zero) cai no fallback sem folga', () => {
    expect(escalaMinimaPorEixo({ largura: 100, altura: 0 }, { largura: 100, altura: 100 })).toEqual({ x: 1, y: 1 });
  });
});

describe('estiloTransformEnquadramento', () => {
  it('sem foco, devolve null (sem transform nenhum)', () => {
    expect(estiloTransformEnquadramento(null)).toBeNull();
  });

  it('sem zoom (escala 1), o translate é sempre zero — x/y não têm efeito', () => {
    expect(estiloTransformEnquadramento({ x: 50, y: 50, escala: 1 })).toBe('translate(0%, 0%) scale(1)');
    expect(estiloTransformEnquadramento({ x: 0, y: 100, escala: 1 })).toBe('translate(0%, 0%) scale(1)');
  });

  it('centralizado (x=50, y=50), o zoom fica simétrico nos dois eixos', () => {
    expect(estiloTransformEnquadramento({ x: 50, y: 50, escala: 2 })).toBe('translate(-50%, -50%) scale(2)');
  });

  it('x=0/y=0 ancora o zoom no canto superior esquerdo (sem deslocar)', () => {
    expect(estiloTransformEnquadramento({ x: 0, y: 0, escala: 2 })).toBe('translate(0%, 0%) scale(2)');
  });

  it('x=100/y=100 ancora o zoom no canto inferior direito', () => {
    expect(estiloTransformEnquadramento({ x: 100, y: 100, escala: 2 })).toBe('translate(-100%, -100%) scale(2)');
  });

  it('foto não-quadrada numa caixa quadrada: dá pra arrastar até a borda mesmo sem zoom manual (escala 1)', () => {
    const imagem = { largura: 200, altura: 100 }; // paisagem — sobra só no eixo x.
    const caixa = { largura: 100, altura: 100 };
    // O scale() do CSS já sai em 2 (a mínima do eixo x) mesmo com escala=1 — é o que faz o
    // `object-fit: contain` (sem corte nenhum) virar, na prática, um `cover` correto pra essa
    // proporção; sem isso o `translate` não teria imagem de verdade pra revelar (`contain` sem
    // escala nenhuma deixa a foto pequena, com barra vazia dos dois lados).
    expect(estiloTransformEnquadramento({ x: 50, y: 50, escala: 1 }, imagem, caixa)).toBe(
      'translate(-50%, 0%) scale(2)',
    );
    expect(estiloTransformEnquadramento({ x: 0, y: 50, escala: 1 }, imagem, caixa)).toBe('translate(0%, 0%) scale(2)');
    expect(estiloTransformEnquadramento({ x: 100, y: 50, escala: 1 }, imagem, caixa)).toBe(
      'translate(-100%, 0%) scale(2)',
    );
  });

  it('foto não-quadrada + zoom manual combinam (a folga da proporção soma com a do slider)', () => {
    const imagem = { largura: 200, altura: 100 };
    const caixa = { largura: 100, altura: 100 };
    // eixo x: escala 2 * mínima 2 = 4 → tx = -(4-1)*100 = -300; eixo y: escala 2 * mínima 1 = 2 → ty = -(2-1)*50 = -50.
    // scale() do CSS: escala 2 * MAIOR mínima (2) = 4 — um único número (nunca escalaX/escalaY
    // direto), senão a imagem esticaria de um jeito diferente em cada eixo.
    expect(estiloTransformEnquadramento({ x: 100, y: 50, escala: 2 }, imagem, caixa)).toBe(
      'translate(-300%, -50%) scale(4)',
    );
  });
});

describe('deslocarPan', () => {
  it('sem zoom (escala <= 1), devolve o valor atual sem mexer — nada pra arrastar', () => {
    expect(deslocarPan(50, 40, 1)).toBe(50);
    expect(deslocarPan(50, -40, 0.5)).toBe(50);
  });

  it('com zoom, converte o delta de arrasto (% da caixa) em novo x/y, invertido e amplificado pela escala', () => {
    // escala 2: delta de 20% da caixa desloca 20/(2-1) = 20 pontos, invertido.
    expect(deslocarPan(50, 20, 2)).toBe(30);
    expect(deslocarPan(50, -20, 2)).toBe(70);
  });

  it('satura em 0/100 mesmo com um arrasto exagerado', () => {
    expect(deslocarPan(50, 9999, 2)).toBe(0);
    expect(deslocarPan(50, -9999, 2)).toBe(100);
  });
});

describe('limitar', () => {
  it('deixa passar valores dentro da faixa', () => {
    expect(limitar(5, 0, 10)).toBe(5);
  });

  it('satura no mínimo e no máximo', () => {
    expect(limitar(-5, 0, 10)).toBe(0);
    expect(limitar(15, 0, 10)).toBe(10);
  });
});
