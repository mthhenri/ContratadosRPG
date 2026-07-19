import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import {
  calcularDanoCorpo,
  calcularDanoFurtivo,
  contarMarcosDanoFurtivo,
  incrementarDadosDanoFurtivo,
  incrementarDanoFurtivo,
  somarDanoFixo,
} from './dano';

/**
 * Dano de Corpo e Dano Furtivo conferidos contra docs/core/sistema-v4.1.0.md —
 * "Corpo e Pontuação Corporal" (tabela Força + Vigor), "Jogando como um Civil"
 * (dano de corpo = Força − 1; sem dano furtivo) e "Progressão" (dano furtivo
 * inicia em 1D6+1 e ganha +1D6+1 nos Níveis 3/6/9/12/15/18).
 */
describe('calcularDanoCorpo', () => {
  it('agente: tabela da Pontuação Corporal (Força + Vigor)', () => {
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: -3, vigor: 0 })).toBe('0 Dano');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 0, vigor: 0 })).toBe('1 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 1, vigor: 1 })).toBe('1D3 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 2, vigor: 2 })).toBe('1D4 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 3, vigor: 3 })).toBe('1D6 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 4, vigor: 5 })).toBe('2D6 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 5, vigor: 6 })).toBe('3D6 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 6, vigor: 6 })).toBe('4D6 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.COMBATENTE, forca: 7, vigor: 7 })).toBe('4D6+7 [Físico]');
  });

  it('civil: dano de corpo = Força − 1 (mínimo 0)', () => {
    expect(calcularDanoCorpo({ classe: ClasseEnum.CIVIL, forca: 2, vigor: 9 })).toBe('1 [Físico]');
    expect(calcularDanoCorpo({ classe: ClasseEnum.CIVIL, forca: 0, vigor: 9 })).toBe('0 [Físico]');
  });
});

describe('calcularDanoFurtivo', () => {
  it('agente: 1D6+1 inicial, +1D6+1 a cada marco (3/6/9/12/15/18)', () => {
    expect(calcularDanoFurtivo({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toBe('1D6+1');
    expect(calcularDanoFurtivo({ classe: ClasseEnum.COMBATENTE, nivel: 2 })).toBe('1D6+1');
    expect(calcularDanoFurtivo({ classe: ClasseEnum.COMBATENTE, nivel: 3 })).toBe('2D6+2');
    expect(calcularDanoFurtivo({ classe: ClasseEnum.COMBATENTE, nivel: 12 })).toBe('5D6+5');
    expect(calcularDanoFurtivo({ classe: ClasseEnum.COMBATENTE, nivel: 20 })).toBe('7D6+7');
  });

  it('civil não possui dano furtivo (retorna null)', () => {
    expect(calcularDanoFurtivo({ classe: ClasseEnum.CIVIL, nivel: 5 })).toBeNull();
  });
});

describe('contarMarcosDanoFurtivo', () => {
  it('conta os marcos (3/6/9/12/15/18) já atingidos por um Nível', () => {
    expect(contarMarcosDanoFurtivo(0)).toBe(0);
    expect(contarMarcosDanoFurtivo(2)).toBe(0);
    expect(contarMarcosDanoFurtivo(3)).toBe(1);
    expect(contarMarcosDanoFurtivo(5)).toBe(1);
    expect(contarMarcosDanoFurtivo(12)).toBe(4);
    expect(contarMarcosDanoFurtivo(20)).toBe(6);
  });
});

describe('incrementarDanoFurtivo', () => {
  it('soma marcos juntando D6 com D6 e fixo com fixo', () => {
    expect(incrementarDanoFurtivo('1D6+1', 1)).toBe('2D6+2');
    expect(incrementarDanoFurtivo('1D6+1', 2)).toBe('3D6+3');
    // Preserva o ajuste manual: 2D6+5 + 1 marco → 3D6+6.
    expect(incrementarDanoFurtivo('2D6+5', 1)).toBe('3D6+6');
    // Incremento zero é no-op.
    expect(incrementarDanoFurtivo('3D6+3', 0)).toBe('3D6+3');
  });

  it('tolera caixa e espaços na notação', () => {
    expect(incrementarDanoFurtivo('2d6 + 2', 1)).toBe('3D6+3');
  });

  it('decrementa com clamp em 0 (descer de Nível não gera componente negativo)', () => {
    expect(incrementarDanoFurtivo('2D6+2', -1)).toBe('1D6+1');
    expect(incrementarDanoFurtivo('1D6+1', -5)).toBe('0D6');
  });

  it('devolve a expressão intacta fora do formato esperado (fail-safe)', () => {
    expect(incrementarDanoFurtivo('4D6+7 [Físico]', 1)).toBe('4D6+7 [Físico]');
  });
});

describe('incrementarDadosDanoFurtivo', () => {
  it('soma só ao número de dados, preservando o fixo (bônus de Formação — m3-23)', () => {
    expect(incrementarDadosDanoFurtivo('1D6+1', 1)).toBe('2D6+1');
    expect(incrementarDadosDanoFurtivo('2D6+5', 1)).toBe('3D6+5');
  });

  it('soma mais de um dado de uma vez', () => {
    expect(incrementarDadosDanoFurtivo('1D6+1', 2)).toBe('3D6+1');
  });

  it('tolera caixa e espaços na notação', () => {
    expect(incrementarDadosDanoFurtivo('2d6 + 2', 1)).toBe('3D6+2');
  });

  it('nunca gera dados negativos (clamp em 0)', () => {
    expect(incrementarDadosDanoFurtivo('1D6+1', -5)).toBe('0D6+1');
  });

  it('devolve a expressão intacta fora do formato esperado (fail-safe)', () => {
    expect(incrementarDadosDanoFurtivo('4D6+7 [Físico]', 1)).toBe('4D6+7 [Físico]');
  });
});

describe('somarDanoFixo', () => {
  it('soma ao número quando não há dado', () => {
    expect(somarDanoFixo('1 [Físico]', 1)).toBe('2 [Físico]');
    expect(somarDanoFixo('0 [Físico]', 1)).toBe('1 [Físico]');
  });

  it('soma ao fixo existente quando há dado', () => {
    expect(somarDanoFixo('4D6+7 [Físico]', 1)).toBe('4D6+8 [Físico]');
  });

  it('cria o fixo quando há dado mas nenhum fixo ainda', () => {
    expect(somarDanoFixo('1D3 [Físico]', 1)).toBe('1D3+1 [Físico]');
  });

  it('é fail-safe no sentinela "0 Dano" (sem componente fixo/tipo)', () => {
    expect(somarDanoFixo('0 Dano', 1)).toBe('0 Dano');
  });

  it('é fail-safe fora do formato esperado', () => {
    expect(somarDanoFixo('dano customizado', 1)).toBe('dano customizado');
  });
});
