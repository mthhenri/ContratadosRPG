import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularDeslocamento } from './movimento';

/**
 * Deslocamento (em metros) conferido contra docs/core/sistema-v4.1.0.md —
 * "Deslocamento" (agente: DES ≤ 0 → 8m; 1–4 → 9m; ≥ 5 → 10m) e "Jogando como um
 * Civil" > "Informações Adicionais" (6m com DES 0–1; 7m com DES 2–3).
 */
describe('calcularDeslocamento', () => {
  it('agente: 8m com Destreza ≤ 0, 9m com 1–4, 10m com ≥ 5', () => {
    expect(calcularDeslocamento({ classe: ClasseEnum.COMBATENTE, destreza: -2 })).toBe(8);
    expect(calcularDeslocamento({ classe: ClasseEnum.COMBATENTE, destreza: 0 })).toBe(8);
    expect(calcularDeslocamento({ classe: ClasseEnum.COMBATENTE, destreza: 1 })).toBe(9);
    expect(calcularDeslocamento({ classe: ClasseEnum.COMBATENTE, destreza: 4 })).toBe(9);
    expect(calcularDeslocamento({ classe: ClasseEnum.COMBATENTE, destreza: 5 })).toBe(10);
  });

  it('civil: 6m com Destreza 0–1, 7m com Destreza ≥ 2', () => {
    expect(calcularDeslocamento({ classe: ClasseEnum.CIVIL, destreza: 0 })).toBe(6);
    expect(calcularDeslocamento({ classe: ClasseEnum.CIVIL, destreza: 1 })).toBe(6);
    expect(calcularDeslocamento({ classe: ClasseEnum.CIVIL, destreza: 2 })).toBe(7);
    expect(calcularDeslocamento({ classe: ClasseEnum.CIVIL, destreza: 3 })).toBe(7);
  });
});
