import { describe, expect, it } from 'vitest';
import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '../../dtos/ficha';
import { HabilidadeCategoriaEnum, RolagemPresetTipoEnum, TipoDanoEnum } from '../../enums';
import {
  expandirAtalhosDano,
  interpretarFormula,
  normalizarPresetLegado,
  reescreverFormulaTeste,
  resolverPreset,
  rolarFormula,
  rolarInterpretada,
  rolarPasso,
  validarFormula,
} from './rolagem';

/**
 * Motor de rolagem (m3-15; gramática v3 m3-29): interpretação e rolagem de fórmulas de preset. A
 * rolagem é determinística nos testes via `rolarDado` injetado. Conferido contra a notação de
 * docs/core/sistema-v4.1.0.md — "Testes" (`(Atributo)d20`, pega o maior; +Proficiência explícita).
 */

const atributos: FichaAtributosDto = {
  destreza: 2,
  forca: 6,
  luta: 3,
  pontaria: 1,
  vigor: 4,
  intelecto: 1,
  medicina: 1,
  sentidos: 2,
  social: 1,
  vontade: 3,
};

/** Rola sempre o valor máximo do dado — determinístico. */
const rolarMaximo = (faces: number): number => faces;

/** Fábrica de roller determinístico que devolve uma sequência de valores. */
const sequencia = (valores: readonly number[]): (() => number) => {
  let indice = 0;
  return () => valores[indice++];
};

describe('interpretarFormula', () => {
  it('interpreta dado + atributo (`1d20+LUT`)', () => {
    const resultado = interpretarFormula('1d20+LUT');
    expect(resultado.valida).toBe(true);
    expect(resultado.formula?.dados).toEqual([{ sinal: 1, quantidade: 1, faces: 20 }]);
    expect(resultado.formula?.atributos).toEqual([{ sinal: 1, atributo: 'luta', rotulo: 'LUT' }]);
    expect(resultado.formula?.constante).toBe(0);
  });

  it('aceita espaços, N implícito, subtração e o nome completo do atributo', () => {
    const resultado = interpretarFormula(' d6 + 2d8 - forca + 3 ');
    expect(resultado.valida).toBe(true);
    expect(resultado.formula?.dados).toEqual([
      { sinal: 1, quantidade: 1, faces: 6 },
      { sinal: 1, quantidade: 2, faces: 8 },
    ]);
    expect(resultado.formula?.atributos).toEqual([{ sinal: -1, atributo: 'forca', rotulo: 'FORCA' }]);
    expect(resultado.formula?.constante).toBe(3);
  });

  it('rejeita fórmula vazia, termo desconhecido e dado inválido', () => {
    expect(interpretarFormula('').valida).toBe(false);
    expect(interpretarFormula('1d20+XYZ').valida).toBe(false);
    expect(interpretarFormula('1d0').valida).toBe(false);
    expect(interpretarFormula('2d').valida).toBe(false);
  });

  it('rejeita quantidade de dados acima do teto', () => {
    expect(interpretarFormula('101d6').valida).toBe(false);
    expect(interpretarFormula('100d6').valida).toBe(true);
  });

  it('validarFormula espelha a validade', () => {
    expect(validarFormula('1d20+LUT')).toBe(true);
    expect(validarFormula('nada')).toBe(false);
  });
});

describe('expandirAtalhosDano', () => {
  it('troca "corpo" e "furtivo" (tolerante a caixa) pela expressão calculada', () => {
    const atalhos = { corpo: '2D6 [Físico]', furtivo: '2D6+2' };
    expect(expandirAtalhosDano('corpo', atalhos)).toBe('2D6 [Físico]');
    expect(expandirAtalhosDano('CORPO + furtivo', atalhos)).toBe('2D6 [Físico] + 2D6+2');
    expect(expandirAtalhosDano('Furtivo', atalhos)).toBe('2D6+2');
  });

  it('a expressão expandida já é fórmula válida por conta própria (dado + tag, sem parênteses)', () => {
    const expandida = expandirAtalhosDano('corpo + furtivo', {
      corpo: '2D6 [Físico]',
      furtivo: '2D6+2',
    });
    expect(validarFormula(expandida)).toBe(true);
  });

  it('só troca a palavra inteira — não afeta termos que só contêm o texto como substring', () => {
    const atalhos = { corpo: '1D3 [Físico]' };
    // "corpodagua" não é o atalho "corpo" — some por termo desconhecido, não por troca parcial.
    expect(expandirAtalhosDano('corpodagua', atalhos)).toBe('corpodagua');
  });

  it('sem a expressão do atalho disponível (ex.: Furtivo de um Civil, `null`), a palavra fica intacta', () => {
    const expandida = expandirAtalhosDano('furtivo + FOR', { corpo: '1 [Físico]', furtivo: null });
    expect(expandida).toBe('furtivo + FOR');
    expect(validarFormula(expandida)).toBe(false);
  });
});

describe('rolarFormula', () => {
  it('rola dados, soma atributo e constante (determinístico)', () => {
    // 1d20 (=20) + LUT (3) + 2 = 25.
    const resultado = rolarFormula({ formula: '1d20+LUT+2', atributos }, rolarMaximo);
    expect(resultado).not.toBeNull();
    expect(resultado?.dados).toEqual([{ sinal: 1, faces: 20, valores: [20], subtotal: 20 }]);
    expect(resultado?.atributos).toEqual([{ rotulo: 'LUT', valor: 3 }]);
    expect(resultado?.constante).toBe(2);
    expect(resultado?.total).toBe(25);
  });

  it('aplica o sinal de subtração aos dados e ao atributo', () => {
    // 2d6 (=12) − FOR (6) = 6.
    const resultado = rolarFormula({ formula: '2d6-FOR', atributos }, rolarMaximo);
    expect(resultado?.dados[0].subtotal).toBe(12);
    expect(resultado?.atributos[0].valor).toBe(-6);
    expect(resultado?.total).toBe(6);
  });

  it('devolve os valores individuais de cada dado', () => {
    const resultado = rolarFormula({ formula: '3d6', atributos }, sequencia([3, 5, 1]));
    expect(resultado?.dados[0].valores).toEqual([3, 5, 1]);
    expect(resultado?.total).toBe(9);
  });

  it('fórmula inválida devolve null', () => {
    expect(rolarFormula({ formula: 'xyz', atributos }, rolarMaximo)).toBeNull();
  });
});

describe('gramática v2 — atributo-como-dado e escalonamento (m3-16)', () => {
  it('interpreta atributo como fonte de dados (`FORd6`, `lutad20`)', () => {
    expect(interpretarFormula('FORd6').formula?.dados).toEqual([
      { sinal: 1, quantidade: 1, faces: 6, quantidadeAtributo: 'forca' },
    ]);
    expect(interpretarFormula('lutad20').formula?.dados).toEqual([
      { sinal: 1, quantidade: 1, faces: 20, quantidadeAtributo: 'luta' },
    ]);
  });

  it('interpreta escalonamento de atributo (`FOR*3`, `LUT/2`)', () => {
    expect(interpretarFormula('FOR*3').formula?.atributos).toEqual([
      { sinal: 1, atributo: 'forca', rotulo: 'FOR*3', multiplicador: 3 },
    ]);
    expect(interpretarFormula('LUT/2').formula?.atributos).toEqual([
      { sinal: 1, atributo: 'luta', rotulo: 'LUT/2', divisor: 2 },
    ]);
  });

  it('rejeita divisor zero e parênteses', () => {
    expect(interpretarFormula('FOR/0').valida).toBe(false);
    expect(interpretarFormula('(1d20)').valida).toBe(false);
    expect(interpretarFormula('1d20)').valida).toBe(false);
  });

  it('rola (Atributo) dados — `FORd6` com FOR=6 → 6 dados', () => {
    // 6 dados de 6 faces, cada um no máximo (=6) → 36.
    const resultado = rolarFormula({ formula: 'FORd6', atributos }, rolarMaximo);
    expect(resultado?.dados[0].valores).toHaveLength(6);
    expect(resultado?.dados[0].subtotal).toBe(36);
    expect(resultado?.total).toBe(36);
  });

  it('atributo ≤ 0 como fonte de dados (sem keep) → 0 dados', () => {
    const semDestreza: FichaAtributosDto = { ...atributos, destreza: 0 };
    const resultado = rolarFormula({ formula: 'DESd20', atributos: semDestreza }, rolarMaximo);
    expect(resultado?.dados[0].valores).toEqual([]);
    expect(resultado?.dados[0].subtotal).toBe(0);
    expect(resultado?.total).toBe(0);
  });

  it('aplica multiplicador e divisor (piso) ao atributo', () => {
    // FOR=6 → ×3 = 18.
    expect(rolarFormula({ formula: 'FOR*3', atributos }, rolarMaximo)?.total).toBe(18);
    // LUT=3 → /2 = floor(1.5) = 1.
    expect(rolarFormula({ formula: 'LUT/2', atributos }, rolarMaximo)?.total).toBe(1);
  });
});

describe('dano tipado e Composto (m3-18)', () => {
  it('estampa o tipo de dano nos termos (`2d8 [Balístico]`)', () => {
    expect(interpretarFormula('2d8 [Balístico]').formula?.dados).toEqual([
      { sinal: 1, quantidade: 2, faces: 8, tipoDano: TipoDanoEnum.BALISTICO },
    ]);
  });

  it('agrupa o total por tipo de dano', () => {
    // 1d6 (=6) + FOR (6) = 12 Físico; 2d4 (=8) Explosão.
    const resultado = rolarFormula({ formula: '1d6+FOR [Físico] + 2d4 [Explosão]', atributos }, rolarMaximo);
    expect(resultado?.grupos).toEqual([
      { tipoDano: TipoDanoEnum.FISICO, total: 12 },
      { tipoDano: TipoDanoEnum.EXPLOSAO, total: 8 },
    ]);
    expect(resultado?.total).toBe(20);
  });

  it('trecho sem tag numa fórmula tipada assume Físico', () => {
    // 2d6 (=12) Explosão + 3 (sem tag) → Físico.
    const resultado = rolarFormula({ formula: '2d6 [Explosão] + 3', atributos }, rolarMaximo);
    expect(resultado?.grupos).toEqual([
      { tipoDano: TipoDanoEnum.EXPLOSAO, total: 12 },
      { tipoDano: TipoDanoEnum.FISICO, total: 3 },
    ]);
    expect(resultado?.total).toBe(15);
  });

  it('Composto divide a soma do segmento 50/50, resto pro primeiro', () => {
    const resultado = rolarFormula({ formula: '2d10 [Físico-Químico]', atributos }, sequencia([10, 5]));
    expect(resultado?.grupos).toEqual([
      { tipoDano: TipoDanoEnum.FISICO, total: 8, composto: true },
      { tipoDano: TipoDanoEnum.QUIMICO, total: 7, composto: true },
    ]);
    expect(resultado?.total).toBe(15);
  });

  it('resolve tags tolerando caixa e acentos (`[quimico]`)', () => {
    expect(interpretarFormula('2d6 [quimico]').formula?.dados[0].tipoDano).toBe(TipoDanoEnum.QUIMICO);
  });

  it('rejeita tipo desconhecido, Composto com Geral, 3 tipos e tipos iguais', () => {
    expect(interpretarFormula('2d6 [Xyz]').valida).toBe(false);
    expect(interpretarFormula('2d6 [Físico-Geral]').valida).toBe(false);
    expect(interpretarFormula('2d6 [Físico-Químico-Balístico]').valida).toBe(false);
    expect(interpretarFormula('2d6 [Físico-Físico]').valida).toBe(false);
  });

  it('rejeita tag sem termos antes e tag malformada', () => {
    expect(interpretarFormula('[Físico]2d6').valida).toBe(false);
    expect(interpretarFormula('2d6[Físico').valida).toBe(false);
  });

  it('fórmula sem tags não gera grupos (regressão)', () => {
    const resultado = rolarFormula({ formula: '2d6+FOR', atributos }, rolarMaximo);
    expect(resultado?.grupos).toBeUndefined();
    expect(resultado?.total).toBe(18); // 2d6 (=12) + FOR (6)
  });

  it('TipoDanoEnum tem os valores de exibição do documento', () => {
    expect(TipoDanoEnum.FISICO).toBe('Físico');
    expect(TipoDanoEnum.BALISTICO).toBe('Balístico');
  });
});

describe('manter maior/menor — kh/kl (m3-29)', () => {
  it('interpreta os operadores de keep', () => {
    expect(interpretarFormula('4d6kh1').formula?.dados).toEqual([
      { sinal: 1, quantidade: 4, faces: 6, manterMaior: 1 },
    ]);
    expect(interpretarFormula('4d6kl2').formula?.dados).toEqual([
      { sinal: 1, quantidade: 4, faces: 6, manterMenor: 2 },
    ]);
    expect(interpretarFormula('4d6kh').formula?.dados[0].manterMaior).toBe(1); // bare kh = 1
  });

  it('kh1 mantém o maior; separa mantidos/descartados preservando a ordem', () => {
    const resultado = rolarFormula({ formula: '4d6kh1', atributos }, sequencia([2, 6, 3, 5]));
    expect(resultado?.dados[0].valores).toEqual([2, 6, 3, 5]);
    expect(resultado?.dados[0].mantidos).toEqual([6]);
    expect(resultado?.dados[0].descartados).toEqual([2, 3, 5]);
    expect(resultado?.dados[0].subtotal).toBe(6);
    expect(resultado?.total).toBe(6);
  });

  it('kl2 mantém os dois menores', () => {
    const resultado = rolarFormula({ formula: '4d6kl2', atributos }, sequencia([2, 6, 3, 5]));
    expect(resultado?.dados[0].mantidos).toEqual([2, 3]);
    expect(resultado?.dados[0].descartados).toEqual([6, 5]);
    expect(resultado?.total).toBe(5);
  });

  it('N maior que o pool mantém tudo', () => {
    const resultado = rolarFormula({ formula: '2d6kh5', atributos }, sequencia([3, 4]));
    expect(resultado?.dados[0].mantidos).toEqual([3, 4]);
    expect(resultado?.dados[0].descartados).toEqual([]);
  });

  it('pool com sinal negativo subtrai o mantido', () => {
    const resultado = rolarFormula({ formula: '-4d6kh1', atributos }, sequencia([2, 6, 3, 5]));
    expect(resultado?.dados[0].subtotal).toBe(-6);
    expect(resultado?.total).toBe(-6);
  });
});

describe('teste de atributo — pool d20 + kh1 + PROF explícita (m3-29)', () => {
  it('atributo puro é sempre modificador (sem sugar de teste)', () => {
    const formula = interpretarFormula('luta').formula;
    expect(formula?.atributos).toEqual([{ sinal: 1, atributo: 'luta', rotulo: 'LUTA' }]);
    expect(formula?.dados).toEqual([]);
  });

  it('`LUTd20kh1 + PROF` pega o maior e soma a Proficiência', () => {
    // luta=3 → 3 D20 [5,18,9], mantém 18; + PROF 2 = 20.
    const resultado = rolarFormula(
      { formula: 'lutad20kh1 + PROF', atributos, proficiencia: 2 },
      sequencia([5, 18, 9]),
    );
    expect(resultado?.dados[0].valores).toEqual([5, 18, 9]);
    expect(resultado?.dados[0].mantidos).toEqual([18]);
    expect(resultado?.dados[0].descartados).toEqual([5, 9]);
    expect(resultado?.dados[0].subtotal).toBe(18);
    expect(resultado?.atributos).toEqual([{ rotulo: 'PROF', valor: 2 }]);
    expect(resultado?.total).toBe(20);
  });

  it('Proficiência nula (Civil) conta como 0', () => {
    const resultado = rolarFormula({ formula: 'lutad20kh1 + PROF', atributos, proficiencia: null }, rolarMaximo);
    expect(resultado?.atributos).toEqual([{ rotulo: 'PROF', valor: 0 }]);
    expect(resultado?.total).toBe(20);
  });

  it('bônus plano (constante) soma ao teste', () => {
    // luta=2 → 2 D20 [10,15], mantém 15; + 2 + PROF 1 = 18.
    const comLutaDois: FichaAtributosDto = { ...atributos, luta: 2 };
    const resultado = rolarFormula(
      { formula: 'lutad20kh1 + 2 + PROF', atributos: comLutaDois, proficiencia: 1 },
      sequencia([10, 15]),
    );
    expect(resultado?.dados[0].mantidos).toEqual([15]);
    expect(resultado?.constante).toBe(2);
    expect(resultado?.total).toBe(18);
  });

  it('sem PROF na fórmula, a Proficiência não entra sozinha', () => {
    // luta=3 → 3 D20 no máximo (20), sem +PROF → total 20 (não soma prof por baixo dos panos).
    const resultado = rolarFormula({ formula: 'lutad20kh1', atributos, proficiencia: 5 }, rolarMaximo);
    expect(resultado?.total).toBe(20);
  });

  it('atributo 0 → desvantagem intrínseca: 2 dados, mantém o menor', () => {
    const semLuta: FichaAtributosDto = { ...atributos, luta: 0 };
    const resultado = rolarFormula({ formula: 'lutad20kh1', atributos: semLuta }, sequencia([12, 5]));
    expect(resultado?.dados[0].valores).toEqual([12, 5]);
    expect(resultado?.dados[0].desvantagem).toBe(true);
    expect(resultado?.dados[0].mantidos).toEqual([5]); // o MENOR
    expect(resultado?.dados[0].descartados).toEqual([12]);
    expect(resultado?.total).toBe(5);
  });

  it('atributo negativo aumenta o pool da desvantagem (−1 → 3, −2 → 4)', () => {
    const lutaMenosUm: FichaAtributosDto = { ...atributos, luta: -1 };
    const r1 = rolarFormula({ formula: 'lutad20kh1', atributos: lutaMenosUm }, sequencia([10, 4, 15]));
    expect(r1?.dados[0].valores).toHaveLength(3);
    expect(r1?.dados[0].mantidos).toEqual([4]);

    const lutaMenosDois: FichaAtributosDto = { ...atributos, luta: -2 };
    const r2 = rolarFormula({ formula: 'lutad20kh1', atributos: lutaMenosDois }, sequencia([9, 2, 20, 7]));
    expect(r2?.dados[0].valores).toHaveLength(4);
    expect(r2?.dados[0].mantidos).toEqual([2]);
  });
});

describe('margem de crítico — cm (m3-29)', () => {
  it('conta os dados que atingiram a margem (d20 cm1 → só o 20)', () => {
    const resultado = rolarFormula({ formula: '4d20cm1', atributos }, sequencia([20, 20, 7, 3]));
    expect(resultado?.dados[0].criticos).toBe(2);
    expect(resultado?.total).toBe(50); // sem keep, soma tudo
  });

  it('cm2 abre a margem para 19–20', () => {
    const resultado = rolarFormula({ formula: '4d20cm2', atributos }, sequencia([19, 20, 18, 5]));
    expect(resultado?.dados[0].criticos).toBe(2);
  });

  it('cm em dado não-d20 usa faces − N + 1 como limiar', () => {
    const resultado = rolarFormula({ formula: '4d6cm1', atributos }, sequencia([6, 6, 3, 1]));
    expect(resultado?.dados[0].criticos).toBe(2); // limiar 6
  });

  it('conta o crítico só entre os dados mantidos pelo keep', () => {
    // luta=3 → 3 D20 [20,20,9]; mantém 1 (o 20); só 1 crítico apesar de dois 20 no pool.
    const resultado = rolarFormula({ formula: 'lutad20kh1cm1', atributos }, sequencia([20, 20, 9]));
    expect(resultado?.dados[0].mantidos).toEqual([20]);
    expect(resultado?.dados[0].criticos).toBe(1);
  });
});

describe('explosão e implosão — não-canônicas (m3-29)', () => {
  it('interpreta os limiares de explosão', () => {
    expect(interpretarFormula('2d6!').formula?.dados[0].explosao).toBe(6); // bare ! = máximo
    expect(interpretarFormula('2d6!>=5').formula?.dados[0].explosao).toBe(5);
    expect(interpretarFormula('2d6!5').formula?.dados[0].explosao).toBe(5);
  });

  it('explode: cada valor no limiar anexa +1 dado', () => {
    // 3 dados base [6,2,4]; o 6 explode → +1 dado (=5, não explode). Pool [6,2,4,5].
    const resultado = rolarFormula({ formula: '3d6!', atributos }, sequencia([6, 2, 4, 5]));
    expect(resultado?.dados[0].valores).toEqual([6, 2, 4, 5]);
    expect(resultado?.total).toBe(17);
  });

  it('explosão respeita o teto de dados (não roda infinito)', () => {
    const resultado = rolarFormula({ formula: '1d6!', atributos }, () => 6);
    expect(resultado?.dados[0].valores).toHaveLength(100); // QUANTIDADE_DADOS_MAXIMA
  });

  it('interpreta os limiares de implosão', () => {
    expect(interpretarFormula('2d6?').formula?.dados[0].implosao).toBe(1); // bare ? = mínimo
    expect(interpretarFormula('2d6?<=2').formula?.dados[0].implosao).toBe(2);
  });

  it('implode: cada valor no limiar mínimo anexa +1 dado', () => {
    // 3 dados base [1,4,2]; o 1 implode → +1 dado. Pool [1,4,2,6].
    const resultado = rolarFormula({ formula: '3d6?', atributos }, sequencia([1, 4, 2, 6]));
    expect(resultado?.dados[0].valores).toEqual([1, 4, 2, 6]);
  });

  it('explode ANTES do keep (dados extras entram no pool do keep)', () => {
    // 1 dado base [6] explode → +[6] explode → +[3]. Pool [6,6,3]; mantém 1 → 6.
    const resultado = rolarFormula({ formula: '1d6kh1!', atributos }, sequencia([6, 6, 3]));
    expect(resultado?.dados[0].valores).toEqual([6, 6, 3]);
    expect(resultado?.dados[0].mantidos).toEqual([6]);
  });
});

describe('validação de operadores (m3-29)', () => {
  it('rejeita combinações e valores inválidos', () => {
    expect(interpretarFormula('4d6kh1kl1').valida).toBe(false); // kh + kl
    expect(interpretarFormula('4d6kh0').valida).toBe(false); // manter zero
    expect(interpretarFormula('4d6zz').valida).toBe(false); // operador desconhecido
    expect(interpretarFormula('2d6!?').valida).toBe(false); // explosão + implosão
    expect(interpretarFormula('2d6cmcm').valida).toBe(false); // repetido
  });

  it('aceita operadores válidos e formas curtas', () => {
    expect(interpretarFormula('4d6kh').valida).toBe(true);
    expect(interpretarFormula('d20cm2').valida).toBe(true);
    expect(interpretarFormula('4d6kh1cm1!').valida).toBe(true);
  });
});

describe('crítico — dobra o dano (m3-30; sistema-v4.1.0 1217/1303)', () => {
  it('dobra o número de dados, os fixos e os atributos (FOR=6, dados no máximo)', () => {
    const formula = interpretarFormula('2d8 + FOR*3 + 5').formula!;
    const normal = rolarInterpretada(formula, atributos, undefined, undefined, rolarMaximo);
    // 2×8 + 6×3 + 5 = 39; sem flag de crítico.
    expect(normal.total).toBe(39);
    expect(normal.critico).toBeUndefined();

    const critico = rolarInterpretada(formula, atributos, undefined, undefined, rolarMaximo, true);
    // Dados dobram (4d8=32), FOR*3 dobra (36), fixo dobra (10) → 78.
    expect(critico.total).toBe(78);
    expect(critico.critico).toBe(true);
    expect(critico.dados[0].valores).toHaveLength(4); // 2d8 → 4d8
  });

  it('NÃO dobra valores de Patente/Nível (PROF/NIV) — regra 1303', () => {
    const formula = interpretarFormula('2d6 + PROF + NIV').formula!;
    const critico = rolarInterpretada(formula, atributos, 3, 2, rolarMaximo, true);
    // 4d6 (=24) + PROF 3 (mantém) + NIV 2 (mantém) = 29.
    expect(critico.total).toBe(29);
  });

  it('dobra dentro do grupo de dano tipado', () => {
    const formula = interpretarFormula('2d8 [Físico]').formula!;
    const critico = rolarInterpretada(formula, atributos, undefined, undefined, rolarMaximo, true);
    expect(critico.grupos).toEqual([{ tipoDano: TipoDanoEnum.FISICO, total: 32 }]); // 4d8 no máximo
  });

  it('resolverPreset carrega `critico` no passo e conta a energia; rolarPasso(critico) dobra o dano', () => {
    const reforco: FichaHabilidadeDto = {
      nome: 'Reforço',
      categoria: HabilidadeCategoriaEnum.GERAL,
      custoEnergia: 4,
      descricao: '',
    };
    const preset: FichaRolagemDto = {
      nome: 'Dano',
      formula: '2d8 [Físico]',
      habilidades: ['Reforço'],
      critico: true,
    };
    const plano = resolverPreset({ preset, atributos, habilidades: [reforco] });
    expect(plano.passos[0].critico).toBe(true);
    // A habilidade **só conta Energia** — não altera a fórmula (efeitos aposentados em m3-31).
    expect(plano.passos[0].energiaGasta).toBe(4);

    // Normal: 2d8 (16). Crítico: 4d8 (32).
    const normal = rolarPasso(plano.passos[0], atributos, undefined, undefined, rolarMaximo, false);
    expect(normal?.grupos).toEqual([{ tipoDano: TipoDanoEnum.FISICO, total: 16 }]);
    const critico = rolarPasso(plano.passos[0], atributos, undefined, undefined, rolarMaximo, true);
    expect(critico?.grupos).toEqual([{ tipoDano: TipoDanoEnum.FISICO, total: 32 }]);
    expect(critico?.critico).toBe(true);
  });

  it('passo sem `critico` fica false no plano', () => {
    const plano = resolverPreset({ preset: { nome: 'S', formula: '2d8 [Físico]' }, atributos });
    expect(plano.passos[0].critico).toBe(false);
  });
});

describe('presets + runner encadeado — resolverPreset/rolarPasso (m3-21)', () => {
  const forcaBruta: FichaHabilidadeDto = {
    nome: 'Força Bruta',
    categoria: HabilidadeCategoriaEnum.ARQUETIPO,
    custoEnergia: 4,
    descricao: 'Soma sua Força × 3 no dano de ataques físicos.',
  };

  it('preset legado {nome, formula} → 1 passo, sem energia', () => {
    const plano = resolverPreset({ preset: { nome: 'Simples', formula: '1d20+LUT' }, atributos });
    expect(plano.passos).toHaveLength(1);
    expect(plano.energiaGasta).toBe(0);
    expect(plano.habilidadesVinculadas).toEqual([]);
  });

  it('encadeado devolve primária + seguintes na ordem', () => {
    const preset: FichaRolagemDto = {
      nome: 'Arma',
      formula: 'lutad20kh1 + PROF',
      tipo: RolagemPresetTipoEnum.ENCADEADO,
      seguintes: [
        { nome: 'Dano', formula: '2d8 [Físico]' },
        { nome: 'Crítico', formula: '4d8 [Físico]' },
      ],
    };
    const plano = resolverPreset({ preset, atributos, proficiencia: 2 });
    expect(plano.passos.map((passo) => passo.nome)).toEqual(['Arma', 'Dano', 'Crítico']);
  });

  it('conta a energia das habilidades vinculadas sem alterar a fórmula (efeitos aposentados em m3-31)', () => {
    const preset: FichaRolagemDto = {
      nome: 'Ataque',
      formula: '2d8 [Físico]',
      habilidades: ['Força Bruta'],
    };
    const plano = resolverPreset({ preset, atributos, habilidades: [forcaBruta] });
    expect(plano.energiaGasta).toBe(4);
    expect(plano.energiaVariavel).toBe(false);
    expect(plano.habilidadesVinculadas).toEqual(['Força Bruta']);
    // A fórmula é crua: 2d8 no máximo = 16 (sem FOR*3 fundido).
    const resultado = rolarPasso(plano.passos[0], atributos, undefined, undefined, rolarMaximo);
    expect(resultado?.grupos).toEqual([{ tipoDano: TipoDanoEnum.FISICO, total: 16 }]);
  });

  it('a mesma habilidade repetida no passo soma a energia por ocorrência (multiconjunto; m3-31)', () => {
    const preset: FichaRolagemDto = {
      nome: 'Ataque',
      formula: '2d8 [Físico]',
      habilidades: ['Força Bruta', 'Força Bruta'],
    };
    const plano = resolverPreset({ preset, atributos, habilidades: [forcaBruta] });
    expect(plano.energiaGasta).toBe(8); // 4 × 2 ocorrências
    expect(plano.habilidadesVinculadas).toEqual(['Força Bruta', 'Força Bruta']);
  });

  it('habilidade vinculada a um passo seguinte só debita naquele passo (m3-22)', () => {
    const preset: FichaRolagemDto = {
      nome: 'Ataque',
      formula: 'lutad20kh1 + PROF',
      tipo: RolagemPresetTipoEnum.ENCADEADO,
      seguintes: [{ nome: 'Dano', formula: '2d8 [Físico]', habilidades: ['Força Bruta'] }],
    };
    const plano = resolverPreset({ preset, atributos, habilidades: [forcaBruta] });
    // A primária (teste) não tem habilidade; só o passo de dano tem a Força Bruta.
    expect(plano.passos[0].habilidadesVinculadas).toEqual([]);
    expect(plano.passos[0].energiaGasta).toBe(0);
    expect(plano.passos[1].habilidadesVinculadas).toEqual(['Força Bruta']);
    expect(plano.passos[1].energiaGasta).toBe(4);
    expect(plano.energiaGasta).toBe(4); // agregado do preset = soma dos passos
  });

  it('custo variável [X E] não soma, mas marca energiaVariavel', () => {
    const variavel: FichaHabilidadeDto = {
      nome: 'Custo X',
      categoria: HabilidadeCategoriaEnum.GERAL,
      custoEnergia: null,
      descricao: '',
    };
    const plano = resolverPreset({
      preset: { nome: 'P', formula: '1d6', habilidades: ['Custo X'] },
      atributos,
      habilidades: [variavel],
    });
    expect(plano.energiaGasta).toBe(0);
    expect(plano.energiaVariavel).toBe(true);
  });

  it('habilidade vinculada inexistente na ficha é ignorada', () => {
    const plano = resolverPreset({
      preset: { nome: 'P', formula: '1d6', habilidades: ['Fantasma'] },
      atributos,
      habilidades: [],
    });
    expect(plano.energiaGasta).toBe(0);
    expect(plano.habilidadesVinculadas).toEqual([]);
  });

  it('rolarPasso devolve null para passo com fórmula inválida', () => {
    const plano = resolverPreset({ preset: { nome: 'X', formula: 'xyz' }, atributos });
    expect(plano.passos[0].interpretacao.valida).toBe(false);
    expect(rolarPasso(plano.passos[0], atributos)).toBeNull();
  });
});

describe('fontes escalares — Proficiência e Nível (m3-22)', () => {
  it('+PROF soma a Proficiência ao total', () => {
    const resultado = rolarFormula({ formula: '2d6 + PROF', atributos, proficiencia: 3 }, rolarMaximo);
    expect(resultado?.total).toBe(15); // 2d6 (=12) + PROF (=3)
  });

  it('+NIV soma o Nível ao total', () => {
    const resultado = rolarFormula({ formula: '1d6 + NIV', atributos, nivel: 5 }, rolarMaximo);
    expect(resultado?.total).toBe(11); // 1d6 (=6) + NIV (=5)
  });

  it('escalona a fonte extra: PROF*2 e NIV/2 (piso)', () => {
    const dobro = rolarFormula({ formula: 'PROF*2', atributos, proficiencia: 3 }, rolarMaximo);
    expect(dobro?.total).toBe(6);
    const metade = rolarFormula({ formula: 'NIV/2', atributos, nivel: 5 }, rolarMaximo);
    expect(metade?.total).toBe(2); // floor(5/2)
  });

  it('PROF como fonte de dados: PROFd6 rola (Proficiência) dados', () => {
    const resultado = rolarFormula({ formula: 'PROFd6', atributos, proficiencia: 3 }, rolarMaximo);
    expect(resultado?.dados[0].valores).toHaveLength(3);
    expect(resultado?.total).toBe(18); // 3 × 6
  });

  it('Proficiência ausente/null resolve como 0 (Civil)', () => {
    const resultado = rolarFormula({ formula: '2d6 + PROF', atributos, proficiencia: null }, rolarMaximo);
    expect(resultado?.total).toBe(12); // PROF = 0
  });

  it('a fonte extra participa de um grupo de dano tipado', () => {
    const resultado = rolarFormula({ formula: '2d6 + NIV [Físico]', atributos, nivel: 4 }, rolarMaximo);
    expect(resultado?.grupos).toEqual([{ tipoDano: TipoDanoEnum.FISICO, total: 16 }]); // 12 + 4
  });

  it('valida PROF e NIV como termos reconhecidos', () => {
    expect(validarFormula('+PROF')).toBe(true);
    expect(validarFormula('+NIV')).toBe(true);
    expect(validarFormula('PROFd20')).toBe(true);
  });
});

describe('migração de presets legados — normalizarPresetLegado (m3-29)', () => {
  it('reescreve o modo TESTE na notação explícita', () => {
    expect(reescreverFormulaTeste('luta')).toBe('lutad20kh1 + PROF');
    expect(reescreverFormulaTeste('lutad20')).toBe('lutad20kh1 + PROF');
    expect(reescreverFormulaTeste('lutad20 + 2')).toBe('lutad20kh1 + 2 + PROF');
  });

  it('é idempotente: fórmula já-v3 passa intacta', () => {
    expect(reescreverFormulaTeste('lutad20kh1 + PROF')).toBe('lutad20kh1 + PROF');
  });

  it('migra um preset TESTE e dropa o modo', () => {
    expect(normalizarPresetLegado({ nome: 'T', formula: 'luta', modo: 'TESTE' })).toEqual({
      nome: 'T',
      formula: 'lutad20kh1 + PROF',
    });
  });

  it('preset SOMA/sem modo só perde a chave modo (fórmula intacta)', () => {
    expect(normalizarPresetLegado({ nome: 'D', formula: '2d8 [Físico]' })).toEqual({
      nome: 'D',
      formula: '2d8 [Físico]',
    });
    expect(normalizarPresetLegado({ nome: 'S', formula: '1d20+LUT', modo: 'SOMA' })).toEqual({
      nome: 'S',
      formula: '1d20+LUT',
    });
  });

  it('reescreve recursivamente só os passos que eram TESTE', () => {
    const migrado = normalizarPresetLegado({
      nome: 'Arma',
      formula: 'luta',
      modo: 'TESTE',
      tipo: RolagemPresetTipoEnum.ENCADEADO,
      seguintes: [{ nome: 'Dano', formula: '2d8 [Físico]' }],
    });
    expect(migrado.formula).toBe('lutad20kh1 + PROF');
    expect(migrado.seguintes?.[0].formula).toBe('2d8 [Físico]');
  });

  it('idempotência total: rodar de novo no já-migrado não muda nada', () => {
    const v3: FichaRolagemDto = { nome: 'T', formula: 'lutad20kh1 + PROF' };
    expect(normalizarPresetLegado(v3)).toEqual(v3);
  });
});
