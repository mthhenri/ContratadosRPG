import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularDefesa, calcularProficiencia } from './defesa';

/**
 * Defesa e Proficiência conferidas contra docs/core/sistema-v4.1.0.md — "Defesa"
 * (Defesa Base = 10 + Nível), "Regras Gerais" (Esquivar soma Destreza; Bloquear
 * usa Vigor), "Progressão" (+1 de Proficiência por Nível) e "Jogando como um
 * Civil" > "Defesa e Reações" (civis não possuem defesa).
 */
describe('calcularDefesa', () => {
  it('Defesa Base = 10 + Nível; Esquiva soma Destreza; Bloqueio soma Vigor', () => {
    expect(calcularDefesa({ classe: ClasseEnum.COMBATENTE, nivel: 0, destreza: 2, vigor: 1 })).toEqual({
      defesa: 10,
      esquiva: 12,
      bloqueio: 11,
    });
    expect(calcularDefesa({ classe: ClasseEnum.SUPORTE, nivel: 5, destreza: 3, vigor: 2 })).toEqual({
      defesa: 15,
      esquiva: 18,
      bloqueio: 17,
    });
  });

  it('civil não possui defesa (retorna null)', () => {
    expect(calcularDefesa({ classe: ClasseEnum.CIVIL, nivel: 3, destreza: 2, vigor: 2 })).toBeNull();
  });
});

describe('calcularProficiencia', () => {
  it('agente: Proficiência = Nível', () => {
    expect(calcularProficiencia({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toBe(0);
    expect(calcularProficiencia({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, nivel: 7 })).toBe(7);
  });

  it('civil não possui proficiência (retorna null)', () => {
    expect(calcularProficiencia({ classe: ClasseEnum.CIVIL, nivel: 5 })).toBeNull();
  });
});
