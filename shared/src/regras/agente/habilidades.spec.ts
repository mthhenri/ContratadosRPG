import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularLimiteHabilidadesPorTurno } from './habilidades';

/**
 * Limite de Habilidades por Turno conferido contra docs/core/sistema-v4.1.0.md —
 * "Habilidades" (limite inicial de 4), tabela de "Progressão" (+1 por Turno nos
 * Níveis 2/4/6/8/12/14/16/18 e +2 nos Níveis 10 e 20) e "Jogando como um Civil"
 * (limite fixo de 3).
 */
describe('calcularLimiteHabilidadesPorTurno', () => {
  it('agente: base 4, sem ganhos antes do Nível 2', () => {
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toBe(4);
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.COMBATENTE, nivel: 1 })).toBe(4);
  });

  it('agente: +1 por Turno nos Níveis pares até o 8', () => {
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.COMBATENTE, nivel: 2 })).toBe(5);
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.COMBATENTE, nivel: 8 })).toBe(8);
  });

  it('agente: Nível 10 concede +2 (2 Habilidades por Turno)', () => {
    // base 4 + (2,4,6,8 = +4) + (10 = +2) = 10
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.COMBATENTE, nivel: 10 })).toBe(10);
  });

  it('agente: Nível 20 acumula todos os ganhos (base 4 + 12 = 16)', () => {
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.COMBATENTE, nivel: 20 })).toBe(16);
  });

  it('civil: limite fixo de 3', () => {
    expect(calcularLimiteHabilidadesPorTurno({ classe: ClasseEnum.CIVIL, nivel: 5 })).toBe(3);
  });
});
