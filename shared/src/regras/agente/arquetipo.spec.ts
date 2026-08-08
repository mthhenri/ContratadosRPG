import { describe, expect, it } from 'vitest';
import { ArquetipoEnum, ClasseEnum } from '../../enums';
import { obterBonusAtributos, obterBonusAtributosComEscolha, obterSlotsEscolhaBonus } from './arquetipo';

/**
 * Atributos Bônus fixos por arquétipo/subclasse, conferidos contra docs/core/sistema-v4.1.0.md —
 * "Classes e Arquétipos" e "Subclasses". Os pontos "à escolha" do documento não entram (só o fixo).
 */
describe('obterBonusAtributos', () => {
  it('arquétipos do Combatente (bônus fixos do documento)', () => {
    expect(obterBonusAtributos({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR })).toEqual({
      luta: 1,
      forca: 1,
    });
    expect(
      obterBonusAtributos({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.MERCENARIO }),
    ).toEqual({ pontaria: 1, destreza: 1 });
    expect(
      obterBonusAtributos({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.VANGUARDA }),
    ).toEqual({ vigor: 1, forca: 1 });
  });

  it('arquétipos com ponto "à escolha" concedem só o fixo', () => {
    expect(
      obterBonusAtributos({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO }),
    ).toEqual({ intelecto: 1 });
    expect(
      obterBonusAtributos({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO }),
    ).toEqual({ destreza: 1 });
    expect(
      obterBonusAtributos({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ACADEMICO }),
    ).toEqual({ intelecto: 1 });
  });

  it('subclasses (Experimentos) concedem o bônus fixo — Híbrido é todo "à escolha" (vazio)', () => {
    expect(obterBonusAtributos({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, arquetipo: null })).toEqual({
      forca: 1,
      vigor: 1,
    });
    expect(
      obterBonusAtributos({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, arquetipo: null }),
    ).toEqual({ intelecto: 1, sentidos: 1 });
    expect(obterBonusAtributos({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null })).toEqual(
      {},
    );
  });

  it('Civil e classe base sem arquétipo não concedem bônus', () => {
    expect(obterBonusAtributos({ classe: ClasseEnum.CIVIL, arquetipo: null })).toEqual({});
    expect(obterBonusAtributos({ classe: ClasseEnum.COMBATENTE, arquetipo: null })).toEqual({});
  });
});

describe('obterSlotsEscolhaBonus', () => {
  it('Engenheiro: um slot com Força ou Destreza', () => {
    expect(
      obterSlotsEscolhaBonus({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO }),
    ).toEqual([['forca', 'destreza']]);
  });

  it('Assassino: um slot com Luta ou Pontaria', () => {
    expect(
      obterSlotsEscolhaBonus({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO }),
    ).toEqual([['luta', 'pontaria']]);
  });

  it('Acadêmico: um slot livre, sem Luta nem Pontaria', () => {
    const slots = obterSlotsEscolhaBonus({ classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ACADEMICO });
    expect(slots).toHaveLength(1);
    expect(slots[0]).not.toContain('luta');
    expect(slots[0]).not.toContain('pontaria');
    expect(slots[0]).toHaveLength(8);
  });

  it('Experimento Híbrido: dois slots livres iguais, sem Luta nem Pontaria', () => {
    const slots = obterSlotsEscolhaBonus({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null });
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual(slots[1]);
    expect(slots[0]).not.toContain('luta');
    expect(slots[0]).not.toContain('pontaria');
  });

  it('perfis sem ponto à escolha devolvem lista vazia', () => {
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR })).toEqual([]);
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, arquetipo: null })).toEqual([]);
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.CIVIL, arquetipo: null })).toEqual([]);
    expect(obterSlotsEscolhaBonus({ classe: ClasseEnum.COMBATENTE, arquetipo: null })).toEqual([]);
  });
});

describe('obterBonusAtributosComEscolha', () => {
  it('soma o fixo com a escolha válida', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO },
        ['destreza'],
      ),
    ).toEqual({ intelecto: 1, destreza: 1 });
  });

  it('escolha null não soma nada além do fixo', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ASSASSINO },
        [null],
      ),
    ).toEqual({ destreza: 1 });
  });

  it('escolha fora das opções do slot é ignorada', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.ESPECIALISTA, arquetipo: ArquetipoEnum.ENGENHEIRO },
        ['vigor'], // vigor não é opção do slot do Engenheiro (só forca/destreza)
      ),
    ).toEqual({ intelecto: 1 });
  });

  it('Híbrido com a mesma escolha nos dois slots empilha +2 no atributo', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null },
        ['vigor', 'vigor'],
      ),
    ).toEqual({ vigor: 2 });
  });

  it('Híbrido com escolhas diferentes soma +1 em cada', () => {
    expect(
      obterBonusAtributosComEscolha(
        { classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null },
        ['vigor', 'intelecto'],
      ),
    ).toEqual({ vigor: 1, intelecto: 1 });
  });

  it('sem slots, devolve exatamente o bônus fixo (mesmo resultado de obterBonusAtributos)', () => {
    expect(
      obterBonusAtributosComEscolha({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.LUTADOR }, []),
    ).toEqual({ luta: 1, forca: 1 });
  });
});
