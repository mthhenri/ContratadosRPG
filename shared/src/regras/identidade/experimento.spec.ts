import { describe, expect, it } from 'vitest';
import type { FichaHabilidadeDto } from '../../dtos/ficha';
import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import { ehClasseExperimento, experimentoComAnomalia, experimentoComPeculiaridade } from './experimento';

const peculiaridade: FichaHabilidadeDto = {
  nome: 'Peculiaridade',
  categoria: HabilidadeCategoriaEnum.SUBCLASSE,
  custoEnergia: 0,
  descricao: '...',
};

const anomalia: FichaHabilidadeDto = {
  nome: 'Anomalia',
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

describe('experimentoComAnomalia', () => {
  it('true para Experimento Artificial com a habilidade Anomalia (P-013)', () => {
    expect(experimentoComAnomalia(ClasseEnum.EXPERIMENTO_ARTIFICIAL, [anomalia])).toBe(true);
  });

  it.each([ClasseEnum.EXPERIMENTO_BESTIAL, ClasseEnum.EXPERIMENTO_HIBRIDO])(
    'false para %s — a habilidade só existe no catálogo de Artificial',
    (classe) => {
      expect(experimentoComAnomalia(classe, [anomalia])).toBe(false);
    },
  );

  it('false para uma classe base, mesmo com uma habilidade chamada "Anomalia"', () => {
    expect(experimentoComAnomalia(ClasseEnum.COMBATENTE, [anomalia])).toBe(false);
  });

  it('false para Artificial sem a habilidade Anomalia', () => {
    expect(experimentoComAnomalia(ClasseEnum.EXPERIMENTO_ARTIFICIAL, [])).toBe(false);
  });

  it('false quando o nome bate mas a categoria não é SUBCLASSE (evita falso positivo de habilidade custom)', () => {
    const custom: FichaHabilidadeDto = { ...anomalia, categoria: HabilidadeCategoriaEnum.GERAL };
    expect(experimentoComAnomalia(ClasseEnum.EXPERIMENTO_ARTIFICIAL, [custom])).toBe(false);
  });
});

describe('ehClasseExperimento', () => {
  it.each([ClasseEnum.EXPERIMENTO_BESTIAL, ClasseEnum.EXPERIMENTO_ARTIFICIAL, ClasseEnum.EXPERIMENTO_HIBRIDO])(
    'true para %s',
    (classe) => {
      expect(ehClasseExperimento(classe)).toBe(true);
    },
  );

  it.each([ClasseEnum.COMBATENTE, ClasseEnum.ESPECIALISTA, ClasseEnum.SUPORTE, ClasseEnum.CIVIL])(
    'false para %s',
    (classe) => {
      expect(ehClasseExperimento(classe)).toBe(false);
    },
  );
});
