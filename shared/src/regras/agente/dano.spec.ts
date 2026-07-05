import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularDanoCorpo, calcularDanoFurtivo } from './dano';

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
