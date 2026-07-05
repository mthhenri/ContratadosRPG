import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularSanidade } from './sanidade';

/**
 * Sanidade conferida contra docs/core/sistema-v4.1.0.md — "Sanidade": um agente
 * suporta Vontade + 1 traumas não tratados ("Traumas") e remove Vontade sequelas
 * ao encerrar uma missão ("Sequelas"). O site antigo exibia o limite de traumas
 * como N/A para civis, então `limiteTraumas` vem `null` para a classe Civil.
 */
describe('calcularSanidade', () => {
  it('agente: limite de traumas = Vontade + 1; sequelas removidas por missão = Vontade', () => {
    expect(calcularSanidade({ classe: ClasseEnum.COMBATENTE, vontade: 3 })).toEqual({
      limiteTraumas: 4,
      sequelasRemovidasPorMissao: 3,
    });
    expect(calcularSanidade({ classe: ClasseEnum.SUPORTE, vontade: 0 })).toEqual({
      limiteTraumas: 1,
      sequelasRemovidasPorMissao: 0,
    });
  });

  it('civil: sem limite de traumas (null); ainda remove Vontade sequelas por missão', () => {
    expect(calcularSanidade({ classe: ClasseEnum.CIVIL, vontade: 2 })).toEqual({
      limiteTraumas: null,
      sequelasRemovidasPorMissao: 2,
    });
  });
});
