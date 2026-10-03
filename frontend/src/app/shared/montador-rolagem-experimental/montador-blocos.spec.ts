import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import {
  expandirAtalhosDano,
  interpretarFormula,
  montarFormula,
  tokenizarFormula,
} from '@contratados-rpg/shared/regras/rolagem';

import corpus from '../../../../../docs/design/propostas/montador-rolagem-formulas.json';
import {
  BLOCO_VAZIO,
  cabeNoDano,
  escreverBlocos,
  formulasEquivalentes,
  lerBlocos,
  modoDosBlocos,
  podeMontarBlocosOuTeste,
} from './montador-blocos';
import { type AmbienteMontador, resumirFormula } from './montador-leitura';

const ATALHOS = { corpo: '2D6 [Físico]', furtivo: '2D6+2' };
const ambiente: AmbienteMontador = {
  atributos: {
    destreza: 2,
    forca: 3,
    luta: 4,
    pontaria: 1,
    vigor: 4,
    intelecto: 7,
    medicina: 0,
    sentidos: 0,
    social: 4,
    vontade: 2,
  },
  proficiencia: 2,
  nivel: 3,
};

function remontar(formula: string): string {
  const blocos = lerBlocos(tokenizarFormula(formula)!);
  if (!blocos) throw new Error(`sem blocos: ${formula}`);
  return montarFormula(escreverBlocos(blocos));
}

const todas = [...corpus.jogadores, ...corpus.bateria, ...corpus.esperada_apos_expressao];
const validas = todas.filter((formula) => interpretarFormula(expandirAtalhosDano(formula, ATALHOS)).valida);

/** Blocos (montador-exp-04, E3.2) sobre o corpus de aceite: nenhuma fórmula diverge, e as que subtraem passam a montar. */
describe('montador-blocos — corpus', () => {
  const comBlocos = validas.filter((formula) => {
    const tokenizada = tokenizarFormula(formula);
    return tokenizada !== null && lerBlocos(tokenizada) !== null;
  });

  it('as dez fórmulas dos jogadores montam (como blocos ou como teste)', () => {
    const naoMontam = corpus.jogadores.filter((formula) => !podeMontarBlocosOuTeste(tokenizarFormula(formula)!));
    expect(naoMontam).toEqual([]);
  });

  it(`nenhuma das ${comBlocos.length} fórmulas em blocos muda de faixa ou média ao ser reescrita pelos blocos`, () => {
    const divergentes = comBlocos.filter((formula) => {
      const original = resumirFormula(expandirAtalhosDano(formula, ATALHOS), ambiente);
      const reescrita = resumirFormula(expandirAtalhosDano(remontar(formula), ATALHOS), ambiente);
      return JSON.stringify(original) !== JSON.stringify(reescrita);
    });
    expect(divergentes).toEqual([]);
  });

  it('fórmulas com termo subtraindo montam (a E3.2 do mockup só somava)', () => {
    for (const formula of ['3d6-2', 'd6+2d8-FOR+3', '2d6-FOR', '2d6+FOR[F]-1d8[Q]+3', '2d6[F]-2']) {
      expect(lerBlocos(tokenizarFormula(formula)!)).not.toBeNull();
    }
    expect(remontar('d6+2d8-FOR+3')).toBe('1d6 + 2d8 - FOR + 3');
  });
});

describe('montador-blocos — regras do formulário', () => {
  it('um bloco por tipo de dano, com uma contagem por dado', () => {
    expect(lerBlocos(tokenizarFormula('3D10+36 [Balístico] + 3D8 [Químico]')!)).toEqual({
      atalhos: [],
      repeticoes: 1,
      blocos: [
        { ...BLOCO_VAZIO, tipo: { primeiro: TipoDanoEnum.BALISTICO, segundo: null }, dados: { 10: 3 }, bonus: 36 },
        { ...BLOCO_VAZIO, tipo: { primeiro: TipoDanoEnum.QUIMICO, segundo: null }, dados: { 8: 3 } },
      ],
    });
  });

  it('o mesmo dado duas vezes soma quando tem o mesmo sinal; com sinais trocados não cabe', () => {
    expect(remontar('2d4+2d4')).toBe('4d4');
    expect(lerBlocos(tokenizarFormula('2d6-1d6')!)).toBeNull();
  });

  it('opções valem para o bloco inteiro: dados do bloco com opções diferentes não cabem', () => {
    expect(remontar('4d6kh1cm1!')).toBe('4d6kh1cm1!');
    expect(lerBlocos(tokenizarFormula('2d6kh1+1d8')!)).toBeNull();
  });

  it('atalhos vão para o início do texto sem mudar o valor', () => {
    expect(remontar('2d6+FOR[F]+CORPO')).toBe('CORPO + 2d6 + FOR [F]');
    expect(formulasEquivalentes('2d6+FOR[F]+CORPO', 'CORPO + 2d6 + FOR [F]')).toBe(true);
  });

  it('fica fora dos blocos: conta, atributo escalado, dado por atributo e mais de 3 blocos', () => {
    for (const formula of ['2d6+(FOR+VIG)*2', 'FOR*3', 'FORd6', '1d4[F]+1d4[B]+1d4[Q]+1d4[E]']) {
      expect(lerBlocos(tokenizarFormula(formula)!)).toBeNull();
    }
  });

  it('dano de arma comporta até 2 blocos sem opções; o resto vai para dados livres', () => {
    const dois = lerBlocos(tokenizarFormula('2d6[F]+1d6[Q]')!)!;
    const tres = lerBlocos(tokenizarFormula('2d6[F]+1d6[Q]+1d4[B]')!)!;
    const comOpcao = lerBlocos(tokenizarFormula('4d6kh1')!)!;
    expect(cabeNoDano(dois)).toBe(true);
    expect(cabeNoDano(tres)).toBe(false);
    expect(modoDosBlocos(dois, 'DANO')).toBe('DANO');
    expect(modoDosBlocos(tres, 'DANO')).toBe('LIVRE');
    expect(modoDosBlocos(comOpcao, 'DANO')).toBe('LIVRE');
    expect(modoDosBlocos(dois, null)).toBe('LIVRE');
  });

  it('equivalência compara valor, não ordem nem rótulo', () => {
    expect(formulasEquivalentes('d8+d4+FOR', '1d4 + 1d8 + FOR')).toBe(true);
    expect(formulasEquivalentes('luta', 'LUT')).toBe(true);
    expect(formulasEquivalentes('2d6[F]', '2d6[Q]')).toBe(false);
    expect(formulasEquivalentes('2d6kh1', '2d6')).toBe(false);
  });
});
