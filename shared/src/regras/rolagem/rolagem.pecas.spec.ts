import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TipoDanoEnum } from '../../enums';
import type { FormulaTokenizadaDto } from './rolagem.dtos';
import { expandirAtalhosDano, interpretarFormula } from './rolagem';
import { montarFormula, tokenizarFormula } from './rolagem.pecas';

/**
 * Fórmula em peças (montador-exp-01, I-041): `montarFormula(tokenizarFormula(texto))` precisa ser lida pelo motor
 * **igual** ao texto original; o que não tem representação volta `null` (o montador mostra "avançada"). O corpus de
 * aceite é o de `docs/specs/active/montador-rolagem-experimento/montador-rolagem-formulas.json` (fórmulas dos jogadores + bateria + formas
 * de conta da `rolagem-expressao-quantidade-dados`).
 */

const corpus = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../docs/specs/active/montador-rolagem-experimento/montador-rolagem-formulas.json'), 'utf8'),
) as { jogadores: string[]; bateria: string[]; esperada_apos_expressao: string[] };

const todas = [...corpus.jogadores, ...corpus.bateria, ...corpus.esperada_apos_expressao];
const validas = todas.filter((formula) => interpretarFormula(formula).valida);
const temAtalho = (formula: string): boolean => /\b(corpo|furtivo)\b/i.test(formula);

/** Expansões reais de `CORPO` (sempre tipada) e `FURTIVO` (sem tag) de um agente de exemplo. */
const atalhosDoAgente = { corpo: '3D6 [Físico]', furtivo: '3D6+3' };

function remontar(formula: string): string {
  const tokenizada = tokenizarFormula(formula);
  if (!tokenizada) {
    throw new Error(`sem peças em teste: ${formula}`);
  }
  return montarFormula(tokenizada);
}

describe('corpus do montador — montar(tokenizar(texto)) é lido igual pelo motor', () => {
  it('o corpus tem as dez fórmulas dos jogadores, todas válidas no motor', () => {
    expect(corpus.jogadores).toHaveLength(10);
    expect(corpus.jogadores.every((formula) => interpretarFormula(formula).valida)).toBe(true);
  });

  it(`as ${validas.length} fórmulas válidas do corpus têm peças (nenhuma vira "avançada")`, () => {
    expect(validas.filter((formula) => tokenizarFormula(formula) === null)).toEqual([]);
  });

  it.each(validas)('%s', (formula) => {
    expect(interpretarFormula(remontar(formula))).toEqual(interpretarFormula(formula));
  });

  it('fórmulas inválidas no motor (sem atalho) devolvem null', () => {
    const invalidas = todas.filter((formula) => !interpretarFormula(formula).valida && !temAtalho(formula));
    expect(invalidas.length).toBeGreaterThan(0);
    for (const formula of invalidas) {
      expect(tokenizarFormula(formula)).toBeNull();
    }
  });

  it('fórmulas com CORPO/FURTIVO do corpus mantêm a leitura depois de expandidas', () => {
    const comAtalho = todas.filter(temAtalho);
    expect(comAtalho.length).toBeGreaterThan(0);
    for (const formula of comAtalho) {
      const remontada = remontar(formula);
      expect(interpretarFormula(expandirAtalhosDano(remontada, atalhosDoAgente))).toEqual(
        interpretarFormula(expandirAtalhosDano(formula, atalhosDoAgente)),
      );
    }
  });
});

describe('tokenizarFormula — peças', () => {
  it('teste de atributo com dado a mais, crítico, bônus e repetição', () => {
    expect(tokenizarFormula('((PON+1)d20kh1cm1+PROF+2+6)#2')).toEqual({
      repeticoes: 2,
      pecas: [
        {
          tipo: 'DADO',
          sinal: 1,
          quantidade: { tipo: 'CONTA', texto: 'PON+1' },
          faces: 20,
          manterMaior: 1,
          margemCritico: 1,
        },
        { tipo: 'FONTE', sinal: 1, fonte: 'proficiencia', nome: 'PROF' },
        { tipo: 'NUMERO', sinal: 1, valor: 2 },
        { tipo: 'NUMERO', sinal: 1, valor: 6 },
      ],
    });
  });

  it('a tag do segmento vale para cada peça dele; composto vira par', () => {
    expect(tokenizarFormula('3D10+36 [Balístico] + 2d6 [F-Q]')?.pecas).toEqual([
      { tipo: 'DADO', sinal: 1, quantidade: { tipo: 'NUMERO', valor: 3 }, faces: 10, tipoDano: TipoDanoEnum.BALISTICO },
      { tipo: 'NUMERO', sinal: 1, valor: 36, tipoDano: TipoDanoEnum.BALISTICO },
      {
        tipo: 'DADO',
        sinal: 1,
        quantidade: { tipo: 'NUMERO', valor: 2 },
        faces: 6,
        composto: [TipoDanoEnum.FISICO, TipoDanoEnum.QUIMICO],
      },
    ]);
  });

  it('sinal por termo: dado e atributo subtraídos', () => {
    const pecas = tokenizarFormula('d6+2d8-FOR+3-1d4')?.pecas ?? [];
    expect(pecas.map((peca) => peca.sinal)).toEqual([1, 1, -1, 1, -1]);
  });

  it('grupo tipado com sinal de fora passa o sinal para cada dado', () => {
    const pecas = tokenizarFormula('2d6 [F] - (1d4+1d6)[B]')?.pecas ?? [];
    expect(pecas.map((peca) => peca.sinal)).toEqual([1, -1, -1]);
  });

  it('fonte como quantidade, fonte escalada e nome por extenso', () => {
    expect(tokenizarFormula('LUTd20kh1 + FOR*3 - luta/2')?.pecas).toEqual([
      {
        tipo: 'DADO',
        sinal: 1,
        quantidade: { tipo: 'FONTE', fonte: 'luta', nome: 'LUT' },
        faces: 20,
        manterMaior: 1,
      },
      { tipo: 'FONTE', sinal: 1, fonte: 'forca', nome: 'FOR', multiplicador: 3 },
      { tipo: 'FONTE', sinal: -1, fonte: 'luta', nome: 'LUTA', divisor: 2 },
    ]);
  });

  it('dado dentro da conta de quantidade vira peça de dado e volta igual', () => {
    const tokenizada = tokenizarFormula('(1d6)d20 + (2d4+FOR)d6 [F]');
    expect(tokenizada?.pecas.map((peca) => peca.tipo === 'DADO' && peca.quantidade)).toEqual([
      { tipo: 'CONTA', texto: '1D6' },
      { tipo: 'CONTA', texto: '2D4+FOR' },
    ]);
    expect(montarFormula(tokenizada!)).toBe('(1D6)d20 + (2D4+FOR)d6 [F]');
  });

  it('conta de bônus fixo, inclusive tipada em grupo', () => {
    expect(tokenizarFormula('2d6 + (FOR+VIG)*2')?.pecas[1]).toEqual({ tipo: 'CONTA', sinal: 1, texto: '(FOR+VIG)*2' });
    expect(tokenizarFormula('(for+vig)[Q]')?.pecas).toEqual([
      { tipo: 'CONTA', sinal: 1, texto: '(FOR+VIG)', tipoDano: TipoDanoEnum.QUIMICO },
    ]);
  });

  it('operadores de explosão e implosão guardam o limiar', () => {
    expect(tokenizarFormula('4d6!')?.pecas[0]).toMatchObject({ explosao: 6 });
    expect(tokenizarFormula('2d6?<=2')?.pecas[0]).toMatchObject({ implosao: 2 });
  });

  it('atalhos CORPO/FURTIVO viram peças sem tag', () => {
    expect(tokenizarFormula('corpo + FOR [F]')?.pecas).toEqual([
      { tipo: 'ATALHO', sinal: 1, atalho: 'CORPO' },
      { tipo: 'FONTE', sinal: 1, fonte: 'forca', nome: 'FOR', tipoDano: TipoDanoEnum.FISICO },
    ]);
  });

  it('nunca troca uma peça em silêncio: atalho no fim de um trecho tipado fica "avançada"', () => {
    // `FOR+FURTIVO[Q]` expande para `FOR+2D6+2[Q]` (tudo Químico); separar o atalho mudaria o tipo dele.
    expect(tokenizarFormula('FOR+FURTIVO[Q]')).toBeNull();
  });

  it('texto vazio, inválido ou com termo desconhecido devolve null', () => {
    expect(tokenizarFormula('')).toBeNull();
    expect(tokenizarFormula('   ')).toBeNull();
    expect(tokenizarFormula('2d6+')).toBeNull();
    expect(tokenizarFormula('2d6+XYZ')).toBeNull();
    expect(tokenizarFormula('(2d12+2)[F]')).toBeNull();
    expect(tokenizarFormula('(1d6)#21')).toBeNull();
  });
});

describe('montarFormula — texto a partir das peças', () => {
  it('normaliza o texto mantendo a leitura', () => {
    expect(remontar('d20+5')).toBe('1d20 + 5');
    expect(remontar('2d20kl')).toBe('2d20kl1');
    expect(remontar('3d6[Físico]+2d6[Químico]')).toBe('3d6 [F] + 2d6 [Q]');
    expect(remontar('(2d6+1d8)[F]+(1d4+1d6)[B]')).toBe('2d6 + 1d8 [F] + 1d4 + 1d6 [B]');
    expect(remontar('((Int+soc)/2)d20kh1cm1+prof')).toBe('((INT+SOC)/2)d20kh1cm1 + PROF');
  });

  it('peça sem tag antes de um trecho tipado sai com [F], o Físico que o motor já lhe daria', () => {
    const formula: FormulaTokenizadaDto = {
      pecas: [
        { tipo: 'FONTE', sinal: 1, fonte: 'forca', nome: 'FOR' },
        { tipo: 'DADO', sinal: 1, quantidade: { tipo: 'NUMERO', valor: 2 }, faces: 6, tipoDano: TipoDanoEnum.QUIMICO },
        { tipo: 'NUMERO', sinal: -1, valor: 2 },
      ],
    };
    const texto = montarFormula(formula);
    expect(texto).toBe('FOR [F] + 2d6 [Q] - 2');
    const grupos = interpretarFormula(texto).formula;
    expect(grupos?.atributos[0].tipoDano).toBe(TipoDanoEnum.FISICO);
    expect(grupos?.dados[0].tipoDano).toBe(TipoDanoEnum.QUIMICO);
  });

  it('primeira peça negativa, conta com soma no topo entre parênteses, atalho sem tag e repetição', () => {
    const formula: FormulaTokenizadaDto = {
      repeticoes: 3,
      pecas: [
        { tipo: 'ATALHO', sinal: 1, atalho: 'CORPO' },
        { tipo: 'DADO', sinal: -1, quantidade: { tipo: 'CONTA', texto: 'FOR+VIG' }, faces: 4 },
        { tipo: 'CONTA', sinal: 1, texto: 'FOR+VIG', tipoDano: TipoDanoEnum.QUIMICO },
      ],
    };
    expect(montarFormula(formula)).toBe('(CORPO - (FOR+VIG)d4 [F] + (FOR+VIG) [Q])#3');
    expect(montarFormula({ pecas: [{ tipo: 'NUMERO', sinal: -1, valor: 3 }] })).toBe('-3');
  });

  it('sem peças devolve texto vazio', () => {
    expect(montarFormula({ pecas: [] })).toBe('');
    expect(montarFormula({ pecas: [], repeticoes: 2 })).toBe('');
  });
});
