import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import { montarFormula, rolarFormula, tokenizarFormula, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { describe, expect, it } from 'vitest';

import type { AmbienteMontador } from './montador-leitura';
import { type TesteMontador, escreverTeste, formulaInicialDoTeste, lerTeste, trocarAtributoDoTeste } from './montador-pecas';
import { RECEITAS_MONTADOR } from './montador-modelo';

/**
 * Montador → fórmula → motor, de ponta a ponta e determinístico (`montador-rolagens-revisao`, Entregável 2).
 * O que o editor de Teste promete nos controles (atributos, dados a mais ou a menos, manter maior/menor, margem de
 * crítico, PROF, NIV, bônus, repetição) tem de ser exatamente o que o motor rola. O oráculo de cada caso vem do
 * Sistema ("Testes", "Crítico e Margem de Crítico"), não do código sob teste. Os dados são injetados.
 */

const atributos: FichaAtributosDto = {
  luta: 3, pontaria: 3, forca: 6, destreza: 2, vigor: 2,
  medicina: 3, intelecto: 2, vontade: 2, sentidos: 2, social: 4,
};

/** Dados sequenciais; registra as faces pedidas (para contar quantos dados o motor rolou). */
function dadosFixos(valores: readonly number[]) {
  const pedidos: number[] = [];
  let indice = 0;
  const rolar = (faces: number): number => {
    pedidos.push(faces);
    if (indice >= valores.length) throw new Error(`Rolou mais dados (${pedidos.length}) que os ${valores.length} previstos`);
    return valores[indice++];
  };
  return { rolar, pedidos };
}

const teste = (parcial: Partial<TesteMontador> = {}): TesteMontador => ({
  atributos: ['LUT'], combinacao: 'SOMA', extra: 0, manter: 'MAIOR', margem: 0,
  proficiencia: false, nivel: false, bonus: 0, repeticoes: 1, ...parcial,
});

/** O que o jogador faz: monta no editor, o texto vai para a barra e a barra rola. */
function rolarMontagem(montagem: TesteMontador, valores: readonly number[], ambiente: { proficiencia?: number; nivel?: number } = {}) {
  const formula = montarFormula(escreverTeste(montagem));
  const { rolar, pedidos } = dadosFixos(valores);
  const resultado = rolarFormula({ formula, atributos, proficiencia: ambiente.proficiencia, nivel: ambiente.nivel }, rolar);
  return { formula, resultado: resultado as ResultadoRolagemDto, pedidos };
}

describe('montador de Teste → motor: o resultado bate com o que foi montado', () => {
  it('um atributo, manter maior: rola N d20 (N = atributo) e fica com o maior', () => {
    const { formula, resultado, pedidos } = rolarMontagem(teste(), [4, 17, 9]); // LUT = 3
    expect(formula).toBe('LUTd20kh1');
    expect(pedidos).toEqual([20, 20, 20]);
    expect(resultado.dados[0].mantidos).toEqual([17]);
    expect(resultado.total).toBe(17);
  });

  it('manter menor fica com o menor dos dados', () => {
    const { formula, resultado } = rolarMontagem(teste({ manter: 'MENOR' }), [4, 17, 9]);
    expect(formula).toBe('LUTd20kl1');
    expect(resultado.dados[0].mantidos).toEqual([4]);
    expect(resultado.total).toBe(4);
  });

  it('dados a mais (+2) rolam 2 d20 a mais; dados a menos (−1) rolam 1 a menos', () => {
    const mais = rolarMontagem(teste({ extra: 2 }), [1, 2, 3, 4, 15]);
    expect(mais.formula).toBe('(LUT+2)d20kh1');
    expect(mais.pedidos).toHaveLength(5);
    expect(mais.resultado.total).toBe(15);
    const menos = rolarMontagem(teste({ extra: -1 }), [6, 12]);
    expect(menos.formula).toBe('(LUT-1)d20kh1');
    expect(menos.pedidos).toHaveLength(2);
    expect(menos.resultado.total).toBe(12);
  });

  it('dois atributos em Soma: rola a soma dos dois atributos', () => {
    const soma = rolarMontagem(teste({ atributos: ['INT', 'SOC'], combinacao: 'SOMA' }), [3, 8, 14, 5, 1, 2]); // 2 + 4
    expect(soma.formula).toBe('(INT+SOC)d20kh1');
    expect(soma.pedidos).toHaveLength(6);
    expect(soma.resultado.total).toBe(14);
  });

  it('dois atributos em Média (arredondada para baixo), sem e com dados a mais', () => {
    const media = rolarMontagem(teste({ atributos: ['INT', 'SOC'], combinacao: 'MEDIA' }), [10, 11, 12]); // (2+4)/2 = 3
    expect(media.formula).toBe('((INT+SOC)/2)d20kh1');
    expect(media.pedidos).toHaveLength(3);
    const mediaMais = rolarMontagem(teste({ atributos: ['INT', 'SOC'], combinacao: 'MEDIA', extra: 1 }), [1, 2, 3, 4]);
    expect(mediaMais.pedidos).toHaveLength(4);
  });

  it('Proficiência e Nível somam o valor do contexto; bônus fixo soma com sinal', () => {
    const { formula, resultado } = rolarMontagem(
      teste({ proficiencia: true, nivel: true, bonus: -3 }), [5, 9, 7], { proficiencia: 4, nivel: 2 },
    );
    expect(formula).toBe('LUTd20kh1 + PROF + NIV - 3');
    expect(resultado.total).toBe(9 + 4 + 2 - 3);
  });

  it('crítico: o maior dado no topo (20) soma +2 uma única vez, qualquer que seja a margem escolhida', () => {
    for (const margem of [0, 1]) {
      const { resultado } = rolarMontagem(teste({ margem }), [20, 20, 3]);
      expect(resultado.total, `margem ${margem}`).toBe(22);
      expect(resultado.dados[0].criticos).toBe(1);
    }
  });

  it('margem 2 e 3 ampliam o crítico para 19–20 e 18–20, e 17 não crítica na margem 3', () => {
    expect(rolarMontagem(teste({ margem: 2 }), [19, 3, 4]).resultado.total).toBe(21);
    expect(rolarMontagem(teste({ margem: 2 }), [18, 3, 4]).resultado.total).toBe(18);
    expect(rolarMontagem(teste({ margem: 3 }), [18, 3, 4]).resultado.total).toBe(20);
    expect(rolarMontagem(teste({ margem: 3 }), [17, 3, 4]).resultado.total).toBe(17);
  });

  it('repetir a rolagem N vezes produz N resultados independentes, cada um com a sua montagem', () => {
    const { formula, resultado, pedidos } = rolarMontagem(teste({ repeticoes: 2 }), [4, 17, 9, 2, 3, 8]);
    expect(formula).toBe('(LUTd20kh1)#2');
    expect(pedidos).toHaveLength(6);
    expect(resultado.subResultados?.map((sub) => sub.total)).toEqual([17, 8]);
  });
});

describe('divergências conhecidas entre o rótulo do editor e o motor (registradas, ainda não corrigidas)', () => {
  it('D1: "Margem de crítico = Sem" rola igual a "Máximo" — o Sistema dá margem natural 1 a todo teste', () => {
    const sem = rolarMontagem(teste({ margem: 0 }), [20, 5, 5]);
    const maximo = rolarMontagem(teste({ margem: 1 }), [20, 5, 5]);
    expect(sem.formula).toBe('LUTd20kh1');
    expect(maximo.formula).toBe('LUTd20kh1cm1');
    expect(sem.resultado.total).toBe(maximo.resultado.total);
    expect(sem.resultado.total).toBe(22); // "Sem" crítico, e mesmo assim somou o +2
  });

  it('D2: o mesmo "−1 dado" muda de semântica conforme a forma — com atributo 1 vira 0 dados; sem o extra, 1 dado', () => {
    const baixo: FichaAtributosDto = { ...atributos, luta: 1 };
    const rolar = (montagem: TesteMontador, valores: readonly number[]) => {
      const { rolar: dado, pedidos } = dadosFixos(valores);
      const resultado = rolarFormula({ formula: montarFormula(escreverTeste(montagem)), atributos: baixo }, dado);
      return { pedidos, resultado };
    };
    expect(rolar(teste(), [14]).pedidos).toHaveLength(1);
    const comExtraNegativo = rolar(teste({ extra: -1 }), [14, 3, 3]);
    expect(comExtraNegativo.pedidos.length).not.toBe(1);
  });
});

/**
 * D3 (decisão do autor, 25/11/2026): o dadinho do atributo na Visão Geral é a referência. Ele rola
 * `<ATR>d20kh1cm1 + PROF + modificador` com o atributo somado ao dado de Formação (`FichaVisualizacao.rolarTesteAtributo`);
 * o Teste do montador leva os mesmos ajustes e, para o mesmo atributo, rola o mesmo resultado.
 */
describe('Teste do montador × dadinho da Visão Geral (D3)', () => {
  const receitaTeste = RECEITAS_MONTADOR.find((receita) => receita.modo === 'TESTE')!;
  const ambiente: AmbienteMontador = {
    atributos, proficiencia: 4, nivel: 2,
    ajustesTeste: { luta: { dados: 1, modificador: 2 }, forca: { dados: 0, modificador: -1 } },
  };

  /** O que `rolarTesteAtributo` faz: dado de Formação soma na contagem do atributo; modificador vira constante. */
  function dadinho(chave: 'luta' | 'forca', sigla: string, valores: readonly number[]) {
    const ajuste = ambiente.ajustesTeste![chave]!;
    const sufixo = ajuste.modificador === 0 ? '' : ajuste.modificador > 0 ? ` + ${ajuste.modificador}` : ` - ${-ajuste.modificador}`;
    const { rolar, pedidos } = dadosFixos(valores);
    const resultado = rolarFormula({
      formula: `${sigla}d20kh1cm1 + PROF${sufixo}`,
      atributos: { ...atributos, [chave]: atributos[chave] + ajuste.dados },
      proficiencia: ambiente.proficiencia, nivel: ambiente.nivel,
    }, rolar) as ResultadoRolagemDto;
    return { resultado, pedidos };
  }

  function montador(formula: string, valores: readonly number[]) {
    const { rolar, pedidos } = dadosFixos(valores);
    const resultado = rolarFormula(
      { formula, atributos, proficiencia: ambiente.proficiencia, nivel: ambiente.nivel }, rolar,
    ) as ResultadoRolagemDto;
    return { resultado, pedidos };
  }

  it('o ponto de partida do Teste (LUT) leva o dado de Formação e o modificador da ficha', () => {
    const formula = formulaInicialDoTeste(receitaTeste.formula, ambiente);
    expect(formula).toBe('(LUT+1)d20kh1cm1 + PROF + 2');
    const dados = [3, 18, 7, 12]; // LUT 3 + 1 dado de Formação = 4 d20
    const doDadinho = dadinho('luta', 'LUT', dados);
    const doMontador = montador(formula, dados);
    expect(doMontador.pedidos).toEqual(doDadinho.pedidos);
    expect(doMontador.resultado.total).toBe(doDadinho.resultado.total);
    expect(doMontador.resultado.total).toBe(18 + 4 + 2);
  });

  it('trocar o atributo leva os ajustes do novo atributo; o que o jogador mexeu à mão fica', () => {
    const inicial = lerTeste(tokenizarParaTeste(formulaInicialDoTeste(receitaTeste.formula, ambiente)))!;
    const emForca = trocarAtributoDoTeste(inicial, ['FOR'], ambiente);
    expect(emForca.extra).toBe(0);
    expect(emForca.bonus).toBe(-1);
    const formulaForca = montarFormula(escreverTeste(emForca));
    const dados = [2, 5, 9, 1, 6, 14]; // FOR 6 d20
    const doDadinho = dadinho('forca', 'FOR', dados);
    const doMontador = montador(formulaForca, dados);
    expect(doMontador.resultado.total).toBe(doDadinho.resultado.total);
    // Ajuste manual (extra 3) não é sobrescrito ao trocar de atributo.
    const manual = trocarAtributoDoTeste({ ...inicial, extra: 3 }, ['FOR'], ambiente);
    expect(manual.extra).toBe(3);
  });

  it('sem ajustes da ficha (mestre, criatura) a fórmula de partida é a da receita', () => {
    expect(formulaInicialDoTeste(receitaTeste.formula, { atributos, proficiencia: 0, nivel: 0 })).toBe(receitaTeste.formula);
  });
});

function tokenizarParaTeste(formula: string) {
  return tokenizarFormula(formula)!;
}
