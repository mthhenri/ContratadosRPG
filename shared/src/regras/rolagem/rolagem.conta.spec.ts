import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { TipoDanoEnum } from '../../enums';
import {
  analisarConta,
  avaliarConta,
  contaTemDado,
  contaTemFonte,
  listarDadosDaConta,
  substituirDadosDaConta,
} from './rolagem.conta';
import { CONTA_PROFUNDIDADE_MAXIMA, CONTA_TAMANHO_MAXIMO, QUANTIDADE_DADOS_MAXIMA } from './rolagem.dados';
import type { FonteEscalar, FormulaInterpretadaDto, ResultadoRolagemDto } from './rolagem.dtos';
import { interpretarFormula, rolarFormula, rolarInterpretada, validarFormula } from './rolagem';

/**
 * Conta aritmética nas fórmulas de rolagem (I-041, spec `rolagem-expressao-quantidade-dados`): quantidade de
 * dados `((INT+SOC)/2)d20` e bônus fixo `(FOR+VIG)*2` como conta `+ − × ÷` com parênteses, **arredondada para
 * baixo uma única vez, no fim** — Sistema v4.1.3, “Arredondamentos” (27,5 → 27).
 * Crítico: “Crítico e Margem de Crítico” (+2 no teste; dobra dados e valores no resultado) e
 * “Cura” (exceto o que vem de Patente/Nível — `PROF`/`NIV`). A rolagem é determinística via
 * `rolarDado` injetado.
 */

const base: FichaAtributosDto = {
  destreza: 0,
  forca: 3,
  luta: 4,
  pontaria: 1,
  vigor: 2,
  intelecto: 7,
  medicina: 0,
  sentidos: 0,
  social: 4,
  vontade: 0,
};

const rolarMaximo = (faces: number): number => faces;

/** Lê uma conta com o resolvedor real do motor (via `interpretarFormula` não dá acesso à árvore). */
const resolverDeTeste = (nome: string): FonteEscalar | null => {
  const mapa: Record<string, FonteEscalar> = {
    FOR: 'forca',
    VIG: 'vigor',
    LUT: 'luta',
    INT: 'intelecto',
    SOC: 'social',
    PROF: 'proficiencia',
    NIV: 'nivel',
  };
  return mapa[nome.toUpperCase()] ?? null;
};

function valorDaConta(texto: string, ambiente: Partial<Record<FonteEscalar, number>> = {}, semPatenteNivel = false): number {
  const analise = analisarConta(texto, resolverDeTeste);
  if (!analise.conta) {
    throw new Error(`conta inválida em teste: ${analise.erro}`);
  }
  return avaliarConta(analise.conta, ambiente, semPatenteNivel);
}

function rolar(
  formula: string,
  atributos: Partial<FichaAtributosDto> = {},
  opcoes: { proficiencia?: number; nivel?: number; critico?: boolean } = {},
): ResultadoRolagemDto {
  const resultado = rolarFormula(
    { formula, atributos: { ...base, ...atributos }, proficiencia: opcoes.proficiencia, nivel: opcoes.nivel, critico: opcoes.critico },
    rolarMaximo,
  );
  if (!resultado) {
    throw new Error(`fórmula inválida em teste: ${formula} (${interpretarFormula(formula).erro})`);
  }
  return resultado;
}

describe('avaliador de conta — precedência, parênteses e frações exatas (sistema-v4.1.0.md:2027-2033)', () => {
  it('respeita a precedência de * e / sobre + e −, com associatividade à esquerda', () => {
    expect(valorDaConta('2+3*4')).toBe(14);
    expect(valorDaConta('2*3+4')).toBe(10);
    expect(valorDaConta('20-5-3')).toBe(12);
    expect(valorDaConta('100/5/2')).toBe(10);
    expect(valorDaConta('2*3*4')).toBe(24);
  });

  it('parênteses aninhados mudam a ordem', () => {
    expect(valorDaConta('(2+3)*4')).toBe(20);
    expect(valorDaConta('((2+3)*(4-1))')).toBe(15);
    expect(valorDaConta('2*((1+2)*(3+(4-1)))')).toBe(36);
  });

  it('menos unário no início da conta ou do grupo', () => {
    expect(valorDaConta('-FOR+VIG', { forca: 3, vigor: 2 })).toBe(-1);
    expect(valorDaConta('(-FOR+VIG)*2', { forca: 3, vigor: 2 })).toBe(-2);
    expect(valorDaConta('-(FOR+VIG)', { forca: 3, vigor: 2 })).toBe(-5);
  });

  it('arredonda para baixo UMA vez, no fim: (7/3)*3 vale 7, não 6', () => {
    expect(valorDaConta('(7/3)*3')).toBe(7);
    expect(valorDaConta('(FOR/3)*3', { forca: 7 })).toBe(7);
    // Cada divisão arredondada separado daria 2*3 = 6; em frações exatas é 7.
  });

  it('média de dois atributos arredonda para baixo: (7+4)/2 = 5,5 → 5', () => {
    expect(valorDaConta('(INT+SOC)/2', { intelecto: 7, social: 4 })).toBe(5);
  });

  it('piso vale para negativos também: −1,5 → −2', () => {
    expect(valorDaConta('(FOR-VIG)/2', { forca: 1, vigor: 4 })).toBe(-2);
    expect(valorDaConta('(FOR-VIG)/2', { forca: 1, vigor: 2 })).toBe(-1); // −0,5 → −1
  });

  it('PROF e NIV entram como fontes; `semPatenteNivel` zera as duas', () => {
    const ambiente = { forca: 3, proficiencia: 2, nivel: 5 };
    expect(valorDaConta('FOR+PROF+NIV', ambiente)).toBe(10);
    expect(valorDaConta('FOR+PROF+NIV', ambiente, true)).toBe(3);
  });

  it('fonte ausente do ambiente vale 0', () => {
    expect(valorDaConta('FOR+VIG', { forca: 3 })).toBe(5 - 2);
  });

  it('D2: divisor que vale zero na rolagem faz a conta valer 0 — nunca lança', () => {
    expect(valorDaConta('FOR/VIG', { forca: 5, vigor: 0 })).toBe(0);
    expect(valorDaConta('1+FOR/VIG', { forca: 5, vigor: 0 })).toBe(0);
    expect(valorDaConta('FOR/(VIG-2)', { forca: 5, vigor: 2 })).toBe(0);
  });

  it('exatidão em contas longas: soma de terços volta a inteiro antes do piso', () => {
    expect(valorDaConta('(1/3)+(1/3)+(1/3)')).toBe(1);
    expect(valorDaConta('1/3+1/3+1/3-1')).toBe(0);
  });

  it('`contaTemFonte` distingue conta só de números', () => {
    const so = analisarConta('(2+3)*4', resolverDeTeste).conta;
    const com = analisarConta('(FOR+3)*4', resolverDeTeste).conta;
    expect(so && contaTemFonte(so.raiz)).toBe(false);
    expect(com && contaTemFonte(com.raiz)).toBe(true);
  });
});

describe('avaliador de conta — erros claros, nunca lança', () => {
  const invalidas: Array<[string, string]> = [
    ['', 'vazia'],
    ['()', 'vazia'],
    ['(FOR+VIG', 'Parêntese aberto'],
    ['FOR+VIG)', 'Parêntese fechado'],
    ['FOR**2', 'Operador duplo'],
    ['FOR*', 'Falta um valor'],
    ['*FOR', 'Operador duplo'],
    ['2*-FOR', 'Operador duplo'],
    ['XYZ*2', 'Fonte desconhecida "XYZ"'],
    ['FOR*1.5', 'Decimais'],
    ['FOR/0', 'Divisão por zero'],
    ['FOR/(2-2)', 'Divisão por zero'],
    ['FOR/(1-1)*2', 'Divisão por zero'],
    ['FOR&2', 'não é permitido'],
    ['1234567890*FOR', 'grande demais'],
  ];
  for (const [texto, trecho] of invalidas) {
    it(`"${texto}" → erro com "${trecho}"`, () => {
      const analise = analisarConta(texto, resolverDeTeste);
      expect(analise.conta).toBeUndefined();
      expect(analise.erro).toContain(trecho);
    });
  }

  it('limite de tamanho', () => {
    const analise = analisarConta('1+'.repeat(CONTA_TAMANHO_MAXIMO) + '1', resolverDeTeste);
    expect(analise.erro).toContain('longa demais');
  });

  it('limite de profundidade', () => {
    const aninhada = '('.repeat(CONTA_PROFUNDIDADE_MAXIMA + 1) + 'FOR' + ')'.repeat(CONTA_PROFUNDIDADE_MAXIMA + 1);
    expect(analisarConta(aninhada, resolverDeTeste).erro).toContain('aninhados demais');
    const noLimite = '('.repeat(CONTA_PROFUNDIDADE_MAXIMA) + 'FOR' + ')'.repeat(CONTA_PROFUNDIDADE_MAXIMA);
    expect(analisarConta(noLimite, resolverDeTeste).conta).toBeDefined();
  });

  it('entrada patológica na fórmula inteira não trava nem lança', () => {
    expect(validarFormula('('.repeat(5000))).toBe(false);
    expect(validarFormula(')'.repeat(5000))).toBe(false);
    expect(validarFormula('2d6+' + '('.repeat(300) + 'FOR' + ')'.repeat(300))).toBe(false);
    expect(validarFormula('2d6+' + '1*'.repeat(400) + '1')).toBe(false);
  });
});

describe('quantidade de dados por conta `(<conta>)dM` (I-041)', () => {
  it('a fórmula dos jogadores `((Int+soc)/2)d20kh1cm1+prof` é válida e rola (7 e 4 → 5 dados)', () => {
    expect(validarFormula('((Int+soc)/2)d20kh1cm1+prof')).toBe(true);
    const resultado = rolar('((Int+soc)/2)d20kh1cm1+prof', { intelecto: 7, social: 4 }, { proficiencia: 2 });
    expect(resultado.dados[0].valores).toHaveLength(5); // (7+4)/2 = 5,5 → 5, não 6
    expect(resultado.dados[0].mantidos).toEqual([20]);
    expect(resultado.total).toBe(20 + 2 + 2); // PROF 2 + crítico de teste 2 (Sistema v4.1.3).
    expect(resultado.dados[0].criticos).toBe(1);
  });

  it('((FOR+VIG)*2)d4 com Força 3 e Vigor 2 rola 10 dados de 4', () => {
    const resultado = rolar('((FOR+VIG)*2)d4');
    expect(resultado.dados[0].valores).toHaveLength(10);
    expect(resultado.total).toBe(40);
  });

  it('nomes por extenso e PROF/NIV dentro da conta', () => {
    expect(rolar('((forca+vigor)*2)d4').dados[0].valores).toHaveLength(10);
    expect(rolar('((FOR+PROF)*NIV)d4', {}, { proficiencia: 2, nivel: 3 }).dados[0].valores).toHaveLength(15);
  });

  it('teto de 100 dados', () => {
    expect(rolar('((FOR+VIG)*50)d4').dados[0].valores).toHaveLength(QUANTIDADE_DADOS_MAXIMA);
  });

  it('crítico dobra a quantidade do resultado em dados (Sistema v4.1.3), com o teto de 100', () => {
    expect(rolar('((FOR+VIG)*2)d4', {}, { critico: true }).dados[0].valores).toHaveLength(20);
    expect(rolar('((FOR+VIG)*20)d4', {}, { critico: true }).dados[0].valores).toHaveLength(QUANTIDADE_DADOS_MAXIMA);
  });

  it('sinal por termo: o termo negativo subtrai', () => {
    const resultado = rolar('20-((FOR+VIG)*2)d4');
    expect(resultado.dados[0].sinal).toBe(-1);
    expect(resultado.total).toBe(20 - 40);
  });

  it('combina com [Q], [F-Q] e #2', () => {
    const tipada = interpretarFormula('((FOR+VIG)*2)d4 [Q]').formula;
    expect(tipada?.dados[0].tipoDano).toBe(TipoDanoEnum.QUIMICO);
    const composta = interpretarFormula('((FOR+VIG)*2)d4 [F-Q]').formula;
    expect(composta?.dados[0].composto).toEqual([TipoDanoEnum.FISICO, TipoDanoEnum.QUIMICO]);
    const repetida = rolar('(((FOR+VIG)*2)d4)#2');
    expect(repetida.subResultados).toHaveLength(2);
    expect(repetida.subResultados?.map((sub) => sub.total)).toEqual([40, 40]);
  });

  it('o mesmo termo aceita os operadores por pool (kh, kl, !, ?)', () => {
    expect(rolar('((FOR+VIG)*2)d6kl2').dados[0].mantidos).toHaveLength(2);
    expect(validarFormula('((FOR+VIG)*2)d6!')).toBe(true);
    expect(validarFormula('((FOR+VIG)*2)d6?')).toBe(true);
    expect(validarFormula('((FOR+VIG)*2)d6khkl')).toBe(false);
  });

  it('D1: com kh e resultado ≤ 0 vale a regra de atributo zerado (2+|n| dados, mantém o menor)', () => {
    const emDesvantagem = rolar('(FOR-VIG)d20kh1', { forca: 2, vigor: 5 }); // −3 → 5 dados
    expect(emDesvantagem.dados[0].desvantagem).toBe(true);
    expect(emDesvantagem.dados[0].valores).toHaveLength(5);
    expect(emDesvantagem.dados[0].mantidos).toHaveLength(1);
    const zero = rolar('(FOR-VIG)d20kh1', { forca: 3, vigor: 3 }); // 0 → 2 dados
    expect(zero.dados[0].desvantagem).toBe(true);
    expect(zero.dados[0].valores).toHaveLength(2);
    // Mantém o MENOR: com os dados 7 e 15 sai o 7.
    const ordem = [15, 7];
    const manual = rolarFormula(
      { formula: '(FOR-VIG)d20kh1', atributos: { ...base, forca: 3, vigor: 3 } },
      () => ordem.shift() ?? 1,
    );
    expect(manual?.dados[0].mantidos).toEqual([7]);
  });

  it('D1: sem kh (dano) a quantidade trava em 0, sem desvantagem', () => {
    const resultado = rolar('(FOR-VIG)d6', { forca: 1, vigor: 4 });
    expect(resultado.dados[0].valores).toEqual([]);
    expect(resultado.dados[0].desvantagem).toBeUndefined();
    expect(resultado.total).toBe(0);
  });

  it('D1: as formas legadas `(ATR±n)dM` e `(ATR*Y)dM` continuam travando em 0, sem desvantagem', () => {
    const offset = rolar('(FOR-5)d20kh1', { forca: 2 });
    expect(offset.dados[0].valores).toEqual([]);
    expect(offset.dados[0].desvantagem).toBeUndefined();
    const multiplicado = rolar('(FOR*2)d20kh1', { forca: 0 });
    expect(multiplicado.dados[0].valores).toEqual([]);
    expect(multiplicado.dados[0].desvantagem).toBeUndefined();
  });

  it('D2: divisor por atributo valendo 0 dá 0 dados; divisor literal zero é inválido', () => {
    expect(rolar('(FOR/VIG)d6', { forca: 5, vigor: 0 }).dados[0].valores).toEqual([]);
    expect(validarFormula('(FOR/0)d6')).toBe(false);
  });

  it('conta só de números vira a quantidade ao interpretar, com as regras do `NdM` literal', () => {
    const interpretada = interpretarFormula('(2*3)d6').formula;
    expect(interpretada?.dados[0]).toEqual({ sinal: 1, quantidade: 6, faces: 6 });
    expect(validarFormula('(1-1)d6')).toBe(false);
    expect(validarFormula('(200)d6')).toBe(false);
  });

  it('formas inválidas devolvem erro e nunca lançam', () => {
    for (const formula of ['()d6', '((FOR)d6', '(FOR+VIG))d6', '(FOR**2)d6', '(XYZ+VIG)d6', '(FOR+VIG)d0', '(FOR+VIG)d']) {
      const interpretacao = interpretarFormula(formula);
      expect(interpretacao.valida, formula).toBe(false);
      expect(interpretacao.erro, formula).toBeTruthy();
    }
  });
});

describe('bônus fixo por conta (I-041)', () => {
  it('(FOR+VIG)*2 com 3 e 2 vale 10 e aparece em `atributos` com o rótulo da conta', () => {
    const resultado = rolar('(FOR+VIG)*2');
    expect(resultado.total).toBe(10);
    expect(resultado.atributos).toEqual([{ rotulo: '(FOR+VIG)*2', valor: 10 }]);
    expect(resultado.dados).toEqual([]);
  });

  it('FOR*VIG e 2*(LUT+PROF)', () => {
    expect(rolar('FOR*VIG').total).toBe(6);
    expect(rolar('2*(LUT+PROF)', {}, { proficiencia: 2 }).total).toBe(12);
  });

  it('soma com dados e outros termos', () => {
    expect(rolar('2d6+(FOR+VIG)*2').total).toBe(12 + 10);
    expect(rolar('2d6+(FOR+VIG)*2+3+LUT').total).toBe(12 + 10 + 3 + 4);
  });

  it('a conta é o termo: FOR/2+VIG/2 (3 e 3) dá 2; (FOR/2+VIG/2) dá 3', () => {
    expect(rolar('FOR/2+VIG/2', { forca: 3, vigor: 3 }).total).toBe(2);
    expect(rolar('(FOR/2+VIG/2)', { forca: 3, vigor: 3 }).total).toBe(3);
  });

  it('sinal: o termo negativo subtrai', () => {
    expect(rolar('2d6-(FOR+VIG)*2').total).toBe(12 - 10);
    expect(rolar('2d6-(FOR+VIG)*2').atributos[0].valor).toBe(-10);
  });

  it('tag de tipo: `[Q]` e `[F-Q]` acompanham o bônus por conta', () => {
    const tipada = rolar('2d6[F]+(FOR+VIG)*2[Q]');
    expect(tipada.grupos).toEqual([
      { tipoDano: TipoDanoEnum.FISICO, total: 12 },
      { tipoDano: TipoDanoEnum.QUIMICO, total: 10 },
    ]);
    const composta = rolar('(FOR+VIG)*2[F-Q]');
    expect(composta.grupos).toEqual([
      { tipoDano: TipoDanoEnum.FISICO, total: 5, composto: true },
      { tipoDano: TipoDanoEnum.QUIMICO, total: 5, composto: true },
    ]);
  });

  it('grupo só de fontes seguido de tag é bônus tipado; grupo com dado segue pool tipado', () => {
    expect(rolar('2d6[F]+(FOR+VIG)[Q]').grupos?.find((g) => g.tipoDano === TipoDanoEnum.QUIMICO)?.total).toBe(5);
    expect(rolar('(2d6+1d4)[F]').total).toBe(12 + 4);
    expect(validarFormula('(2d12+2)[F]')).toBe(false); // grupo com dado e número solto segue inválido
  });

  it('conta só de números é constante: (7/3)*3 vale 7', () => {
    const interpretada = interpretarFormula('2d6+(7/3)*3').formula;
    expect(interpretada?.constante).toBe(7);
    expect(interpretada?.contas).toBeUndefined();
    expect(rolar('2d6+(7/3)*3').total).toBe(12 + 7);
  });

  it('D2: divisor por atributo valendo 0 dá bônus 0; divisor literal zero é inválido', () => {
    expect(rolar('2d6+(FOR/VIG)', { forca: 5, vigor: 0 }).total).toBe(12);
    expect(validarFormula('2d6+(FOR/0)')).toBe(false);
    expect(validarFormula('2d6+(FOR/(2-2))')).toBe(false);
  });

  it('`(2d6+FOR)` sem tag nem #N continua erro de parse', () => {
    expect(interpretarFormula('(2d6+FOR)').valida).toBe(false);
    expect(interpretarFormula('2d6+(2d6+FOR)').valida).toBe(false);
  });

  it('formas inválidas devolvem erro e nunca lançam', () => {
    for (const formula of ['(FOR+VIG*2', 'FOR+VIG)*2', '(FOR**2)', 'XYZ*FOR', 'FOR*(XYZ)', '2d6+()', '2d6+(FOR/)']) {
      const interpretacao = interpretarFormula(formula);
      expect(interpretacao.valida, formula).toBe(false);
      expect(interpretacao.erro, formula).toBeTruthy();
    }
  });
});

describe('crítico em bônus por conta — só o que vem de atributos e de números dobra (D4; sistema-v4.1.0.md:1810 e :1965)', () => {
  const critico = (formula: string, atributos: Partial<FichaAtributosDto> = {}, proficiencia = 2): number[] => [
    rolar(formula, atributos, { proficiencia }).total,
    rolar(formula, atributos, { proficiencia, critico: true }).total,
  ];

  it('(FOR+VIG)*2 com 3 e 2 → 10 e 20 (sem PROF/NIV, dobra o valor final)', () => {
    expect(critico('(FOR+VIG)*2')).toEqual([10, 20]);
  });

  it('(FOR+PROF)*2 com 3 e 2 → 10 e 16 (a parcela de FOR vai de 6 a 12; a de PROF fica em 4)', () => {
    expect(critico('(FOR+PROF)*2')).toEqual([10, 16]);
  });

  it('PROF*FOR e PROF*2 não dobram (o valor vem de Patente/Nível)', () => {
    expect(critico('PROF*FOR')).toEqual([6, 6]);
    expect(critico('PROF*2')).toEqual([4, 4]);
  });

  it('o arredondamento é por parcela: (FOR+PROF)/2 com 3 e 2 → 2 e 3', () => {
    expect(critico('(FOR+PROF)/2')).toEqual([2, 3]);
  });

  it('o crítico lista o valor já dobrado no detalhamento e respeita o sinal do termo', () => {
    const resultado = rolar('2d6-(FOR+PROF)*2', {}, { proficiencia: 2, critico: true });
    expect(resultado.atributos).toEqual([{ rotulo: '(FOR+PROF)*2', valor: -16 }]);
    expect(resultado.total).toBe(24 - 16); // 2d6 crítico = 4 dados de 6 no máximo
  });

  it('as formas legadas ATR*N/ATR/N seguem dobrando o valor final, exceto PROF/NIV', () => {
    expect(critico('FOR*3')).toEqual([9, 18]);
    expect(critico('PROF*3')).toEqual([6, 6]);
  });
});

describe('legado intacto — DTO e resultado das formas antigas não mudam (I-041)', () => {
  it('as formas legadas continuam produzindo o DTO de sempre (sem `quantidadeConta`/`contas`)', () => {
    const offset = interpretarFormula('(LUT+3)d20kh1').formula as FormulaInterpretadaDto;
    expect(offset.dados[0]).toEqual({
      sinal: 1,
      quantidade: 1,
      quantidadeAtributo: 'luta',
      quantidadeAtributoOffset: 3,
      faces: 20,
      manterMaior: 1,
    });
    const multiplicado = interpretarFormula('(FOR*2)d6').formula as FormulaInterpretadaDto;
    expect(multiplicado.dados[0].quantidadeConta).toBeUndefined();
    const escalado = interpretarFormula('FOR*3+VIG/2').formula as FormulaInterpretadaDto;
    expect(escalado.atributos).toEqual([
      { sinal: 1, atributo: 'forca', rotulo: 'FOR*3', multiplicador: 3 },
      { sinal: 1, atributo: 'vigor', rotulo: 'VIG/2', divisor: 2 },
    ]);
    expect(escalado.contas).toBeUndefined();
  });
});

describe('corpus do montador — gramática preservada, resultados conforme Sistema v4.1.3', () => {
  interface ItemSnapshot {
    readonly formula: string;
    readonly interpretacao: { readonly valida: boolean; readonly formula?: FormulaInterpretadaDto; readonly erro?: string };
    readonly rolagens?: Record<string, unknown>;
  }
  interface Snapshot {
    readonly ambientes: Record<string, { atributos: FichaAtributosDto; proficiencia: number; nivel: number }>;
    readonly itens: readonly ItemSnapshot[];
  }

  const raiz = resolve(__dirname, '..', '..', '..', '..');
  const snapshot = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures', 'rolagem-corpus.snapshot.json'), 'utf8'),
  ) as Snapshot;
  const corpus = JSON.parse(
    readFileSync(resolve(raiz, 'docs', 'design', 'propostas', 'montador-rolagem-formulas.json'), 'utf8'),
  ) as { jogadores: string[]; bateria: string[]; esperada_apos_expressao: string[] };

  /** Dado determinístico do snapshot: sequência por contador, reiniciada a cada rolagem. */
  const fabricaDado = () => {
    let contador = 0;
    return (faces: number): number => {
      contador += 1;
      return ((contador * 7 + 3) % faces) + 1;
    };
  };

  it('o snapshot cobre todas as fórmulas do corpus (jogadores + bateria)', () => {
    const formulas = new Set(snapshot.itens.map((item) => item.formula));
    for (const formula of [...corpus.jogadores, ...corpus.bateria]) {
      expect(formulas.has(formula), formula).toBe(true);
    }
  });

  const validas = snapshot.itens.filter((item) => item.interpretacao.valida);

  it(`as ${validas.length} fórmulas válidas do snapshot têm a mesma interpretação`, () => {
    for (const item of validas) {
      // O JSON descarta `undefined`; a comparação por JSON é a mesma do fixture.
      expect(JSON.parse(JSON.stringify(interpretarFormula(item.formula))), item.formula).toEqual(item.interpretacao);
    }
  });

  it('as mesmas fórmulas rolam o mesmo resultado, em todos os ambientes, com e sem crítico', () => {
    for (const item of validas) {
      const interpretacao = interpretarFormula(item.formula).formula as FormulaInterpretadaDto;
      for (const [nome, ambiente] of Object.entries(snapshot.ambientes)) {
        for (const critico of [false, true]) {
          const resultado = rolarInterpretada(
            interpretacao,
            ambiente.atributos,
            ambiente.proficiencia,
            ambiente.nivel,
            fabricaDado(),
            critico,
          );
          expect(
            JSON.parse(JSON.stringify(resultado)),
            `${item.formula} · ${nome}${critico ? '-critico' : ''}`,
          ).toEqual(item.rolagens?.[`${nome}${critico ? '-critico' : ''}`]);
        }
      }
    }
  });

  it('as fórmulas inválidas de antes que seguem fora da gramática continuam inválidas', () => {
    const aindaInvalidas = snapshot.itens.filter(
      (item) => !item.interpretacao.valida && !corpus.esperada_apos_expressao.includes(item.formula),
    );
    expect(aindaInvalidas.length).toBeGreaterThan(0);
    for (const item of aindaInvalidas) {
      expect(validarFormula(item.formula), item.formula).toBe(false);
    }
  });

  it('as fórmulas de `esperada_apos_expressao` passam a ser válidas e rolam', () => {
    for (const formula of corpus.esperada_apos_expressao) {
      expect(validarFormula(formula), formula).toBe(true);
      expect(
        rolarFormula({ formula, atributos: base, proficiencia: 2, nivel: 3 }, rolarMaximo),
        formula,
      ).not.toBeNull();
    }
  });
});

describe('dado dentro da conta de quantidade `(1d6)d20`', () => {
  /** Rolagem roteirizada: devolve os valores na ordem e registra as faces pedidas. */
  function roteiro(valores: readonly number[]): { rolarDado: (faces: number) => number; faces: number[] } {
    const faces: number[] = [];
    let indice = 0;
    return {
      faces,
      rolarDado: (facesPedidas) => {
        faces.push(facesPedidas);
        const valor = valores[indice] ?? 1;
        indice += 1;
        return valor;
      },
    };
  }

  function rolarRoteiro(formula: string, valores: readonly number[], critico = false) {
    const { rolarDado, faces } = roteiro(valores);
    const resultado = rolarFormula({ formula, atributos: base, proficiencia: 2, nivel: 3, critico }, rolarDado);
    if (!resultado) {
      throw new Error(`fórmula inválida em teste: ${formula} (${interpretarFormula(formula).erro})`);
    }
    return { resultado, faces };
  }

  it('(1d6)d20 é válida e rola primeiro o 1d6, depois tantos d20 quanto ele deu', () => {
    expect(validarFormula('(1d6)d20')).toBe(true);
    const { resultado, faces } = rolarRoteiro('(1d6)d20', [4, 10, 11, 12, 13]);
    expect(faces).toEqual([6, 20, 20, 20, 20]);
    expect(resultado.dados[0].valores).toEqual([10, 11, 12, 13]);
    expect(resultado.total).toBe(46);
  });

  it('a interpretação guarda o dado na conta (quantidade só existe na rolagem)', () => {
    const formula = interpretarFormula('(1d6)d20').formula;
    expect(formula?.dados[0].quantidadeConta).toEqual({ raiz: { quantidade: 1, faces: 6 } });
  });

  it('aceita dM sem quantidade, caixa alta, espaços e vários dados com fontes', () => {
    expect(rolarRoteiro('(d6)d20', [2, 5, 5]).resultado.dados[0].valores).toHaveLength(2);
    expect(rolarRoteiro('(1D6)D20', [3]).resultado.dados[0].valores).toHaveLength(3);
    // 2d4 = 3+1 = 4; + FOR (3) = 7 dados de 6.
    const { resultado, faces } = rolarRoteiro('( 2d4 + FOR ) d6', [3, 1]);
    expect(faces.slice(0, 2)).toEqual([4, 4]);
    expect(resultado.dados[0].valores).toHaveLength(7);
    // Ordem do texto: o 1d4 antes do 1d8.
    expect(rolarRoteiro('(1d4*1d8)d6', [2, 3]).faces.slice(0, 2)).toEqual([4, 8]);
    expect(rolarRoteiro('(1d4*1d8)d6', [2, 3]).resultado.dados[0].valores).toHaveLength(6);
  });

  it('arredonda para baixo uma vez, no fim: (1d6/2)d20 com 5 → 2 dados', () => {
    expect(rolarRoteiro('(1d6/2)d20', [5]).resultado.dados[0].valores).toHaveLength(2);
  });

  it('resultado ≤ 0 sem kh trava em 0 dados; com kh vale a regra de atributo zerado', () => {
    expect(rolarRoteiro('(1d6-6)d20', [2]).resultado.dados[0].valores).toHaveLength(0);
    const desvantagem = rolarRoteiro('(1d6-6)d20kh1', [2]).resultado.dados[0]; // −4 → 6 dados, mantém o menor
    expect(desvantagem.desvantagem).toBe(true);
    expect(desvantagem.valores).toHaveLength(6);
  });

  it('divisor que vale 0 na rolagem não lança: a conta vale 0', () => {
    expect(validarFormula('(6/(1d6-1))d20')).toBe(true);
    expect(rolarRoteiro('(6/(1d6-1))d20', [1]).resultado.dados[0].valores).toHaveLength(0);
  });

  it('crítico dobra só o pool, não os dados da conta', () => {
    const { resultado, faces } = rolarRoteiro('(1d6)d20', [3], true);
    expect(faces.filter((face) => face === 6)).toHaveLength(1);
    expect(resultado.dados[0].valores).toHaveLength(6);
  });

  it('teto de 100 dados no pool e no dado da conta', () => {
    expect(rolar('(1d200)d4').dados[0].valores).toHaveLength(QUANTIDADE_DADOS_MAXIMA);
    expect(validarFormula('(101d6)d4')).toBe(false);
  });

  it('combina com operadores, sinal, tag de dano e #N; cada repetição rola a conta de novo', () => {
    expect(rolarRoteiro('(1d6)d20kh1cm1 + PROF', [3, 20, 2, 5]).resultado.total).toBe(24);
    expect(rolarRoteiro('10 - (1d4)d6', [2, 6, 6]).resultado.total).toBe(-2);
    expect(interpretarFormula('(1d6)d8 [F-Q]').formula?.dados[0].composto).toEqual([
      TipoDanoEnum.FISICO,
      TipoDanoEnum.QUIMICO,
    ]);
    const repetida = rolarRoteiro('((1d4)d6)#2', [1, 6, 2, 6, 6]).resultado;
    expect(repetida.subResultados?.map((sub) => sub.dados[0].valores.length)).toEqual([1, 2]);
  });

  it('dado continua fora do bônus fixo e erros de dado na conta são claros', () => {
    expect(validarFormula('2d6 + (1d6)*2')).toBe(false);
    expect(analisarConta('1d6+FOR', resolverDeTeste).erro).toMatch(/quantidade de dados/);
    expect(analisarConta('1d6+FOR', resolverDeTeste, { permitirDados: true }).conta).toBeDefined();
    expect(validarFormula('(0d6)d20')).toBe(false);
    expect(validarFormula('(1d0)d20')).toBe(false);
    expect(validarFormula('(FORd6)d20')).toBe(false);
  });

  it('listar e substituir os dados da conta seguem a ordem do texto', () => {
    const conta = analisarConta('(1d4+2d6)*1d8', resolverDeTeste, { permitirDados: true }).conta!;
    expect(contaTemDado(conta.raiz)).toBe(true);
    expect(contaTemFonte(conta.raiz)).toBe(false);
    expect(listarDadosDaConta(conta)).toEqual([
      { quantidade: 1, faces: 4 },
      { quantidade: 2, faces: 6 },
      { quantidade: 1, faces: 8 },
    ]);
    expect(avaliarConta(substituirDadosDaConta(conta, [3, 7, 2]), {})).toBe(20);
  });
});
