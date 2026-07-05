import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularInventario } from './inventario';

/**
 * Inventário base conferido contra docs/core/sistema-v4.1.0.md — "Inventário"
 * (Força × 5; Força 0 → 3; Força negativa → 0) e "Jogando como um Civil"
 * (Inventário = Força × 3).
 */
describe('calcularInventario', () => {
  it('agente: Força × 5', () => {
    expect(calcularInventario({ classe: ClasseEnum.COMBATENTE, forca: 4 })).toBe(20);
  });

  it('agente: Força 0 → 3 de inventário', () => {
    expect(calcularInventario({ classe: ClasseEnum.COMBATENTE, forca: 0 })).toBe(3);
  });

  it('agente: Força negativa → 0', () => {
    expect(calcularInventario({ classe: ClasseEnum.COMBATENTE, forca: -2 })).toBe(0);
  });

  it('civil: Força × 3 (sem a exceção do 3 para Força 0)', () => {
    expect(calcularInventario({ classe: ClasseEnum.CIVIL, forca: 4 })).toBe(12);
    expect(calcularInventario({ classe: ClasseEnum.CIVIL, forca: 0 })).toBe(0);
    expect(calcularInventario({ classe: ClasseEnum.CIVIL, forca: -1 })).toBe(0);
  });
});
