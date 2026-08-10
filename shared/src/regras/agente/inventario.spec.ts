import { describe, expect, it } from 'vitest';
import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import type { FichaHabilidadeDto } from '../../dtos/ficha';
import { calcularInventario } from './inventario';

const mochileiroGeral: FichaHabilidadeDto = {
  nome: 'Mochileiro',
  categoria: HabilidadeCategoriaEnum.GERAL,
  custoEnergia: 0,
  descricao: 'Muda o atributo de cálculo do inventário de Força para Intelecto - 1.',
};

const mochileiroMelhorado: FichaHabilidadeDto = {
  nome: 'Mochileiro',
  categoria: HabilidadeCategoriaEnum.GERAL_MELHORADA,
  custoEnergia: 0,
  descricao: 'Muda o atributo de cálculo do inventário de Força para Intelecto.',
};

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

  describe('habilidade "Mochileiro"', () => {
    it('Geral: troca Força por (Intelecto − 1)', () => {
      expect(
        calcularInventario({
          classe: ClasseEnum.COMBATENTE,
          forca: 4,
          intelecto: 5,
          habilidades: [mochileiroGeral],
        }),
      ).toBe((5 - 1) * 5);
    });

    it('Geral Melhorada (Engenheiro): troca Força por Intelecto cheio, sem penalidade', () => {
      expect(
        calcularInventario({
          classe: ClasseEnum.COMBATENTE,
          forca: 4,
          intelecto: 5,
          habilidades: [mochileiroMelhorado],
        }),
      ).toBe(5 * 5);
    });

    it('sem a habilidade na lista → usa Força normalmente, mesmo com Intelecto informado', () => {
      expect(
        calcularInventario({ classe: ClasseEnum.COMBATENTE, forca: 4, intelecto: 5, habilidades: [] }),
      ).toBe(4 * 5);
    });

    it('Intelecto efetivo 0 (Geral, Intelecto 1 − 1) → exceção do 3 de inventário', () => {
      expect(
        calcularInventario({
          classe: ClasseEnum.COMBATENTE,
          forca: 4,
          intelecto: 1,
          habilidades: [mochileiroGeral],
        }),
      ).toBe(3);
    });

    it('Intelecto efetivo negativo (Geral, Intelecto 0 − 1) → 0 de inventário', () => {
      expect(
        calcularInventario({
          classe: ClasseEnum.COMBATENTE,
          forca: 4,
          intelecto: 0,
          habilidades: [mochileiroGeral],
        }),
      ).toBe(0);
    });
  });
});
