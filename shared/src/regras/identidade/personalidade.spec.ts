import { describe, expect, it } from 'vitest';
import type { FichaIdentidadeDto, FichaPersonalidadeHabilidadeDto } from '../../dtos/ficha';
import { HabilidadeCategoriaEnum, PersonalidadeEstagioEnum } from '../../enums';
import {
  estagioMaisAltoDesbloqueado,
  estagiosDisponiveis,
  materializarHabilidadePersonalidade,
  personalidadeHabilidadeVazia,
} from './personalidade';

const identidadeBase = (habilidade: FichaPersonalidadeHabilidadeDto | undefined): Pick<FichaIdentidadeDto, 'personalidade' | 'habilidade'> => ({
  personalidade: 'Atento',
  habilidade,
});

describe('materializarHabilidadePersonalidade', () => {
  it('null sem identidade.habilidade', () => {
    expect(materializarHabilidadePersonalidade(identidadeBase(undefined))).toBeNull();
  });

  it('materializa a Base com o nome vindo da palavra de personalidade', () => {
    const habilidade: FichaPersonalidadeHabilidadeDto = {
      ativa: PersonalidadeEstagioEnum.BASE,
      base: { descricao: 'Ganha +1 dado ao agir sob pressão.', custoEnergia: 2 },
      fortificacao1: null,
      fortificacao2: null,
    };
    expect(materializarHabilidadePersonalidade(identidadeBase(habilidade))).toEqual({
      nome: 'Atento',
      categoria: HabilidadeCategoriaEnum.PERSONALIDADE,
      custoEnergia: 2,
      descricao: 'Ganha +1 dado ao agir sob pressão.',
    });
  });

  it('null quando a Base está ativa mas sem descrição preenchida', () => {
    const habilidade: FichaPersonalidadeHabilidadeDto = {
      ativa: PersonalidadeEstagioEnum.BASE,
      base: { descricao: '   ', custoEnergia: null },
      fortificacao1: null,
      fortificacao2: null,
    };
    expect(materializarHabilidadePersonalidade(identidadeBase(habilidade))).toBeNull();
  });

  it('materializa a 1ª Fortificação com nome próprio', () => {
    const habilidade: FichaPersonalidadeHabilidadeDto = {
      ativa: PersonalidadeEstagioEnum.FORTIFICACAO_1,
      base: { descricao: 'Base combinada.', custoEnergia: 1 },
      fortificacao1: { nome: 'Atento+', descricao: 'Mais um dado.', custoEnergia: 3 },
      fortificacao2: null,
    };
    expect(materializarHabilidadePersonalidade(identidadeBase(habilidade))).toEqual({
      nome: 'Atento+',
      categoria: HabilidadeCategoriaEnum.PERSONALIDADE,
      custoEnergia: 3,
      descricao: 'Mais um dado.',
    });
  });

  it('materializa a 2ª Fortificação com custo variável (null)', () => {
    const habilidade: FichaPersonalidadeHabilidadeDto = {
      ativa: PersonalidadeEstagioEnum.FORTIFICACAO_2,
      base: null,
      fortificacao1: null,
      fortificacao2: { nome: 'Atento++', descricao: 'Efeito maior.', custoEnergia: null },
    };
    expect(materializarHabilidadePersonalidade(identidadeBase(habilidade))).toEqual({
      nome: 'Atento++',
      categoria: HabilidadeCategoriaEnum.PERSONALIDADE,
      custoEnergia: null,
      descricao: 'Efeito maior.',
    });
  });

  it('null quando o estágio ativo (Fortificação) ainda não foi preenchido', () => {
    const habilidade: FichaPersonalidadeHabilidadeDto = {
      ativa: PersonalidadeEstagioEnum.FORTIFICACAO_1,
      base: { descricao: 'Base combinada.', custoEnergia: 1 },
      fortificacao1: null,
      fortificacao2: null,
    };
    expect(materializarHabilidadePersonalidade(identidadeBase(habilidade))).toBeNull();
  });

  it('personalidadeHabilidadeVazia começa sem nenhum estágio preenchido', () => {
    expect(personalidadeHabilidadeVazia(PersonalidadeEstagioEnum.BASE)).toEqual({
      ativa: PersonalidadeEstagioEnum.BASE,
      base: null,
      fortificacao1: null,
      fortificacao2: null,
    });
  });
});

describe('estagioMaisAltoDesbloqueado', () => {
  it.each([
    [0, PersonalidadeEstagioEnum.BASE],
    [1, PersonalidadeEstagioEnum.FORTIFICACAO_1],
    [2, PersonalidadeEstagioEnum.FORTIFICACAO_2],
  ])('%i fortificações desbloqueadas -> %s', (fortificacoes, esperado) => {
    expect(estagioMaisAltoDesbloqueado(fortificacoes)).toBe(esperado);
  });
});

describe('estagiosDisponiveis', () => {
  it('só Base sem nenhuma fortificação desbloqueada', () => {
    expect(estagiosDisponiveis(0)).toEqual([PersonalidadeEstagioEnum.BASE]);
  });

  it('Base + 1ª Fortificação com 1 desbloqueada', () => {
    expect(estagiosDisponiveis(1)).toEqual([PersonalidadeEstagioEnum.BASE, PersonalidadeEstagioEnum.FORTIFICACAO_1]);
  });

  it('os 3 estágios com 2 desbloqueadas', () => {
    expect(estagiosDisponiveis(2)).toEqual([
      PersonalidadeEstagioEnum.BASE,
      PersonalidadeEstagioEnum.FORTIFICACAO_1,
      PersonalidadeEstagioEnum.FORTIFICACAO_2,
    ]);
  });
});
