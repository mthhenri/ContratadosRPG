import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import {
  expandirAtalhosDano,
  type FormulaTokenizadaDto,
  interpretarFormula,
  montarFormula,
  type PecaFormulaDto,
  tokenizarFormula,
} from '@contratados-rpg/shared/regras/rolagem';

import corpus from '../../../../../docs/design/propostas/montador-rolagem-formulas.json';
import { adicionarPeca, alterarRepeticoes, FORMULA_VAZIA, substituirPeca } from './montador-modelo';
import {
  adicionarDadoMontador,
  alterarOpcoesDado,
  alterarQuantidadeDado,
  aplicarTipoPeca,
  escreverTeste,
  lerDadoExtra,
  lerManterDado,
  lerTeste,
  lerTipoPeca,
  novaPecaFonte,
  novaPecaNumero,
  podeMontarPecas,
  podeMontarPecasOuTeste,
  siglaDaFonte,
} from './montador-pecas';

/**
 * Completo/Essencial (montador-exp-03) sobre o corpus de aceite (`docs/design/propostas/montador-rolagem-formulas.json`):
 * toda fórmula que os controles dizem montar é **remontada só com as operações dos controles** (dado por dado, sinal,
 * tipo, opções, campo de expressão, atalhos, repetição, editor de teste) e o motor tem de ler o resultado igual ao
 * original — **nenhuma diverge**. O que não montam fica "avançada".
 */

const ATALHOS = { corpo: '2D6 [Físico]', furtivo: '2D6+2' };

/** Remonta uma fórmula em termos usando apenas as operações que os botões e campos do editor disparam. */
function remontarPorControles(tokenizada: FormulaTokenizadaDto): FormulaTokenizadaDto {
  let formula: FormulaTokenizadaDto = FORMULA_VAZIA;
  for (const peca of tokenizada.pecas) {
    let nova: PecaFormulaDto;
    switch (peca.tipo) {
      case 'DADO': {
        if (peca.quantidade.tipo === 'CONTA') {
          // Campo de expressão (quantidade de dados) — mesmo objeto que `adicionarExpressao` cria.
          nova = { tipo: 'DADO', sinal: 1, quantidade: { tipo: 'CONTA', texto: peca.quantidade.texto }, faces: peca.faces };
        } else {
          // Botão do dado + quantidade digitada no stepper.
          const comDado = adicionarDadoMontador(FORMULA_VAZIA, peca.faces, null);
          const dado = comDado.pecas[0];
          nova = dado.tipo === 'DADO' && peca.quantidade.tipo === 'NUMERO' ? alterarQuantidadeDado(dado, peca.quantidade.valor) : dado;
        }
        if (nova.tipo === 'DADO') {
          nova = alterarOpcoesDado(nova, {
            manter: lerManterDado(peca),
            extra: lerDadoExtra(peca),
            margem: peca.margemCritico ?? 0,
          });
        }
        break;
      }
      case 'FONTE':
        // Atributo/PROF/NIV pelo botão; escalado (`FOR*3`) pelo campo de expressão (bônus fixo).
        nova =
          peca.multiplicador || peca.divisor
            ? {
                tipo: 'CONTA',
                sinal: 1,
                texto: `${siglaDaFonte(peca.fonte)}${peca.multiplicador ? `*${peca.multiplicador}` : `/${peca.divisor}`}`,
              }
            : novaPecaFonte(siglaDaFonte(peca.fonte), null);
        break;
      case 'NUMERO':
        nova = novaPecaNumero(peca.valor, null);
        break;
      case 'CONTA':
        nova = { tipo: 'CONTA', sinal: 1, texto: peca.texto };
        break;
      case 'ATALHO':
        nova = { tipo: 'ATALHO', sinal: 1, atalho: peca.atalho };
        break;
    }
    // Sinal (segmentado Soma/Subtrai ou ±) e tipo (select Tipo + "Dividir meio a meio com").
    nova = { ...nova, sinal: peca.sinal } as PecaFormulaDto;
    nova = aplicarTipoPeca(nova, lerTipoPeca(peca));
    formula = adicionarPeca(formula, nova);
  }
  return alterarRepeticoes(formula, tokenizada.repeticoes ?? null);
}

/**
 * Leitura do motor sem os rótulos de exibição: remontar `luta` pelo botão escreve `LUT` — mesmo valor, outro rótulo
 * no detalhamento (o "equivalente" das baterias do I-041). Todo o resto (dados, sinais, tipos, contas) é comparado.
 */
function leitura(texto: string) {
  return JSON.parse(
    JSON.stringify(interpretarFormula(expandirAtalhosDano(texto, ATALHOS)), (chave, valor) =>
      chave === 'rotulo' ? undefined : valor,
    ),
  );
}

const todas = [...corpus.jogadores, ...corpus.bateria, ...corpus.esperada_apos_expressao];

describe('montador-pecas — corpus (Completo e Essencial)', () => {
  const montaveis = todas.filter((formula) => {
    const tokenizada = tokenizarFormula(formula);
    return leitura(formula).valida && tokenizada !== null && podeMontarPecasOuTeste(tokenizada);
  });

  it('as dez fórmulas dos jogadores montam pelos controles', () => {
    const naoMontam = corpus.jogadores.filter((formula) => !montaveis.includes(formula));
    expect(naoMontam).toEqual([]);
  });

  it(`nenhuma das ${montaveis.length} fórmulas montáveis diverge ao ser remontada pelos controles`, () => {
    const divergentes = montaveis.filter((formula) => {
      const tokenizada = tokenizarFormula(formula) as FormulaTokenizadaDto;
      const teste = lerTeste(tokenizada);
      const pelosTermos = podeMontarPecas(tokenizada) ? montarFormula(remontarPorControles(tokenizada)) : null;
      const peloTeste = teste ? montarFormula(escreverTeste(teste)) : null;
      const original = JSON.stringify(leitura(formula));
      return (
        (pelosTermos !== null && JSON.stringify(leitura(pelosTermos)) !== original) ||
        (peloTeste !== null && JSON.stringify(leitura(peloTeste)) !== original)
      );
    });
    expect(divergentes).toEqual([]);
  });

  it('o que fica de fora vira "avançada": kh/kl com N > 1, explosão com limiar, dado por atributo, d100', () => {
    for (const formula of ['4d6kl2', '4d6!5', '2d6?<=2', 'FORd6', '1d100', 'LUTd20kh1+FOR', '2d6cm5']) {
      const tokenizada = tokenizarFormula(formula) as FormulaTokenizadaDto;
      expect(podeMontarPecasOuTeste(tokenizada)).toBe(false);
    }
  });
});

describe('montador-pecas — teste de atributo', () => {
  it('lê um atributo, dados a mais, soma e média de dois atributos', () => {
    expect(lerTeste(tokenizarFormula('LUTd20kh1cm1 + PROF')!)).toMatchObject({
      atributos: ['LUT'],
      combinacao: 'SOMA',
      extra: 0,
      manter: 'MAIOR',
      margem: 1,
      proficiencia: true,
      nivel: false,
      bonus: 0,
    });
    expect(lerTeste(tokenizarFormula('(pon+1)d20kh1cm1+prof+6')!)).toMatchObject({ atributos: ['PON'], extra: 1, bonus: 6 });
    expect(lerTeste(tokenizarFormula('((Int+soc)/2)d20kh1cm1+prof')!)).toMatchObject({
      atributos: ['INT', 'SOC'],
      combinacao: 'MEDIA',
    });
    expect(lerTeste(tokenizarFormula('(FOR+VIG-1)d20kl1 + NIV - 2')!)).toMatchObject({
      atributos: ['FOR', 'VIG'],
      combinacao: 'SOMA',
      extra: -1,
      manter: 'MENOR',
      nivel: true,
      bonus: -2,
    });
    expect(lerTeste(tokenizarFormula('((PON+1)d20kh1cm1+PROF+2+6)#2')!)).toMatchObject({ repeticoes: 2, bonus: 8 });
  });

  it('não é teste: d20 sem manter, tipo de dano, outro atributo somado, outra face', () => {
    for (const formula of ['LUTd20', 'LUTd20kh1 [F]', 'LUTd20kh1 + FOR', 'LUTd12kh1', '2d20kh1', 'LUTd20kh2']) {
      expect(lerTeste(tokenizarFormula(formula)!)).toBeNull();
    }
  });

  it('escreve cada ajuste do teste como o motor lê', () => {
    const base = lerTeste(tokenizarFormula('LUTd20kh1 + PROF')!)!;
    expect(montarFormula(escreverTeste({ ...base, extra: 2 }))).toBe('(LUT+2)d20kh1 + PROF');
    expect(montarFormula(escreverTeste({ ...base, atributos: ['INT', 'SOC'], combinacao: 'MEDIA' }))).toBe(
      '((INT+SOC)/2)d20kh1 + PROF',
    );
    expect(montarFormula(escreverTeste({ ...base, atributos: ['FOR', 'VIG'], extra: -1 }))).toBe('(FOR+VIG-1)d20kh1 + PROF');
    expect(montarFormula(escreverTeste({ ...base, manter: 'MENOR', margem: 2, nivel: true, bonus: -3, repeticoes: 3 }))).toBe(
      '(LUTd20kl1cm2 + PROF + NIV - 3)#3',
    );
  });
});

describe('montador-pecas — controles de termo', () => {
  it('tocar no mesmo dado soma quantidade; tipo diferente ou opção abre um termo novo', () => {
    let formula = adicionarDadoMontador(FORMULA_VAZIA, 6, TipoDanoEnum.FISICO);
    formula = adicionarDadoMontador(formula, 6, TipoDanoEnum.FISICO);
    expect(montarFormula(formula)).toBe('2d6 [F]');
    formula = adicionarDadoMontador(formula, 6, null);
    expect(montarFormula(formula)).toBe('2d6 [F] + 1d6');
    const comOpcao = substituirPeca(formula, 1, alterarOpcoesDado(formula.pecas[1] as never, { manter: 'MAIOR' }));
    expect(montarFormula(adicionarDadoMontador(comOpcao, 6, null))).toBe('2d6 [F] + 1d6kh1 + 1d6');
  });

  it('composto exige dois tipos bloqueáveis distintos; senão fica o tipo simples', () => {
    const dado = adicionarDadoMontador(FORMULA_VAZIA, 6, null).pecas[0];
    expect(montarFormula({ pecas: [aplicarTipoPeca(dado, { primeiro: TipoDanoEnum.FISICO, segundo: TipoDanoEnum.QUIMICO })] })).toBe(
      '1d6 [F-Q]',
    );
    expect(montarFormula({ pecas: [aplicarTipoPeca(dado, { primeiro: TipoDanoEnum.FISICO, segundo: TipoDanoEnum.FISICO })] })).toBe(
      '1d6 [F]',
    );
    expect(montarFormula({ pecas: [aplicarTipoPeca(dado, { primeiro: TipoDanoEnum.GERAL, segundo: TipoDanoEnum.QUIMICO })] })).toBe(
      '1d6 [G]',
    );
    expect(montarFormula({ pecas: [aplicarTipoPeca(dado, { primeiro: null, segundo: TipoDanoEnum.QUIMICO })] })).toBe('1d6');
  });

  it('opções do dado: manter, dado extra e margem trocam sem deixar resto', () => {
    const dado = adicionarDadoMontador(FORMULA_VAZIA, 8, null).pecas[0];
    if (dado.tipo !== 'DADO') throw new Error('esperava dado');
    const cheio = alterarOpcoesDado(alterarQuantidadeDado(dado, 4), { manter: 'MAIOR', extra: 'EXPLODE', margem: 2 });
    expect(montarFormula({ pecas: [cheio] })).toBe('4d8kh1cm2!');
    const trocado = alterarOpcoesDado(cheio, { manter: 'TODOS', extra: 'IMPLODE', margem: 0 });
    expect(montarFormula({ pecas: [trocado] })).toBe('4d8?');
    expect(alterarQuantidadeDado(dado, 500).quantidade).toEqual({ tipo: 'NUMERO', valor: 100 });
  });
});
