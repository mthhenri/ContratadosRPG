import { describe, expect, it } from 'vitest';
import { ArquetipoEnum, ClasseEnum } from '../../enums';
import { obterBonusAtributos } from './arquetipo';

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
