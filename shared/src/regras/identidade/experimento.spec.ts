import { describe, expect, it } from 'vitest';
import type { FichaHabilidadeDto } from '../../dtos/ficha';
import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import { experimentoComPeculiaridade } from './experimento';

const peculiaridade: FichaHabilidadeDto = {
  nome: 'Peculiaridade',
  categoria: HabilidadeCategoriaEnum.SUBCLASSE,
  custoEnergia: 0,
  descricao: '...',
};

describe('experimentoComPeculiaridade', () => {
  it.each([ClasseEnum.EXPERIMENTO_BESTIAL, ClasseEnum.EXPERIMENTO_ARTIFICIAL, ClasseEnum.EXPERIMENTO_HIBRIDO])(
    'true para %s com a habilidade Peculiaridade',
    (classe) => {
      expect(experimentoComPeculiaridade(classe, [peculiaridade])).toBe(true);
    },
  );

  it('false para uma classe base, mesmo com uma habilidade chamada "Peculiaridade"', () => {
    expect(experimentoComPeculiaridade(ClasseEnum.COMBATENTE, [peculiaridade])).toBe(false);
  });

  it('false para Experimento sem a habilidade Peculiaridade', () => {
    expect(experimentoComPeculiaridade(ClasseEnum.EXPERIMENTO_BESTIAL, [])).toBe(false);
  });

  it('false quando o nome bate mas a categoria não é SUBCLASSE (evita falso positivo de habilidade custom)', () => {
    const custom: FichaHabilidadeDto = { ...peculiaridade, categoria: HabilidadeCategoriaEnum.GERAL };
    expect(experimentoComPeculiaridade(ClasseEnum.EXPERIMENTO_BESTIAL, [custom])).toBe(false);
  });
});
