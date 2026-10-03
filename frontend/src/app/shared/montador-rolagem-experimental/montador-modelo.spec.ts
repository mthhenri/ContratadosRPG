import type { FormulaTokenizadaDto } from '@contratados-rpg/shared/regras/rolagem';

import {
  adicionarPeca,
  alterarRepeticoes,
  alternarSinalPeca,
  analisarFormulaMontador,
  desfazerPassoHistorico,
  escreverFormula,
  HISTORICO_MONTADOR_LIMITE,
  inserirPeca,
  listarAtalhosDisponiveis,
  RECEITAS_MONTADOR,
  registrarPassoHistorico,
  removerPeca,
  substituirPeca,
} from './montador-modelo';

/** Modelo das versões novas do montador (montador-exp-02): estado derivado do texto, edição por peças e Desfazer. */
describe('montador-modelo', () => {
  describe('analisarFormulaMontador — estado derivado do texto', () => {
    it('vazia', () => {
      expect(analisarFormulaMontador('   ', {}).estado).toBe('VAZIA');
    });

    it('em peças, com a fórmula tokenizada', () => {
      const analise = analisarFormulaMontador('2d6 + FOR [F]', {});
      expect(analise.estado).toBe('PECAS');
      expect(analise.tokenizada?.pecas).toHaveLength(2);
    });

    it('inválida traz o motivo do motor', () => {
      const analise = analisarFormulaMontador('2d6+', {});
      expect(analise.estado).toBe('INVALIDA');
      expect(analise.erro).toBeTruthy();
    });

    it('avançada quando é válida mas não tem peças que o motor leia igual', () => {
      expect(analisarFormulaMontador('FOR+FURTIVO[Q]', { furtivo: '2D6+2' }).estado).toBe('AVANCADA');
    });

    it('atalho sem valor na ficha é inválido; com valor vira peça', () => {
      expect(analisarFormulaMontador('CORPO', {}).estado).toBe('INVALIDA');
      const comValor = analisarFormulaMontador('CORPO + 2', { corpo: '2D6 [Físico]' });
      expect(comValor.estado).toBe('PECAS');
      expect(comValor.tokenizada?.pecas[0]).toEqual({ tipo: 'ATALHO', sinal: 1, atalho: 'CORPO' });
    });

    it('fórmula nova do motor (conta na quantidade de dados) é editável', () => {
      expect(analisarFormulaMontador('((FOR+VIG)*2)d4', {}).estado).toBe('PECAS');
    });
  });

  it('só oferece os atalhos que a ficha sabe expandir', () => {
    expect(listarAtalhosDisponiveis({})).toEqual([]);
    expect(listarAtalhosDisponiveis({ corpo: '1D6 [Físico]', furtivo: null })).toEqual(['CORPO']);
    expect(listarAtalhosDisponiveis({ corpo: '1D6 [Físico]', furtivo: '1D6+1' })).toEqual(['CORPO', 'FURTIVO']);
  });

  it('as receitas de partida são válidas no motor (Dados livres começa em branco)', () => {
    for (const receita of RECEITAS_MONTADOR) {
      const esperado = receita.modo === 'LIVRE' ? 'VAZIA' : 'PECAS';
      expect(analisarFormulaMontador(receita.formula, {}).estado).toBe(esperado);
    }
  });

  describe('edição por peças — sempre produz texto que o motor lê', () => {
    const base = analisarFormulaMontador('2d6 + FOR [F]', {}).tokenizada as FormulaTokenizadaDto;

    it('acrescenta, insere, troca e remove peças', () => {
      const comNumero = adicionarPeca(base, { tipo: 'NUMERO', sinal: 1, valor: 3 });
      expect(escreverFormula(comNumero)).toBe('2d6 + FOR [F] + 3');
      const comAtalhoNoInicio = inserirPeca(base, { tipo: 'ATALHO', sinal: 1, atalho: 'CORPO' }, 0);
      expect(escreverFormula(comAtalhoNoInicio)).toBe('CORPO + 2d6 + FOR [F]');
      const trocada = substituirPeca(base, 1, alternarSinalPeca(base.pecas[1]));
      expect(escreverFormula(trocada)).toBe('2d6 - FOR [F]');
      expect(escreverFormula(removerPeca(base, 0))).toBe('FOR [F]');
      expect(substituirPeca(base, 9, base.pecas[0])).toBe(base);
    });

    it('repetição liga com N ≥ 2, desliga com null/1 e sai junto da última peça', () => {
      const repetida = alterarRepeticoes(base, 3);
      expect(escreverFormula(repetida)).toBe('(2d6 + FOR [F])#3');
      expect(escreverFormula(alterarRepeticoes(repetida, 1))).toBe('2d6 + FOR [F]');
      expect(escreverFormula(alterarRepeticoes(repetida, null))).toBe('2d6 + FOR [F]');
      const umaSo = removerPeca(removerPeca(repetida, 1), 0);
      expect(umaSo).toEqual({ pecas: [] });
      expect(escreverFormula(umaSo)).toBe('');
    });
  });

  describe('Desfazer', () => {
    it('empilha o texto anterior e desfaz na ordem inversa', () => {
      let historico = registrarPassoHistorico([], '');
      historico = registrarPassoHistorico(historico, '2d6');
      const primeiro = desfazerPassoHistorico(historico);
      expect(primeiro?.texto).toBe('2d6');
      const segundo = desfazerPassoHistorico(primeiro!.historico);
      expect(segundo?.texto).toBe('');
      expect(desfazerPassoHistorico(segundo!.historico)).toBeNull();
    });

    it('não repete o mesmo texto e guarda no máximo o limite', () => {
      expect(registrarPassoHistorico(['a'], 'a')).toEqual(['a']);
      let historico: readonly string[] = [];
      for (let indice = 0; indice < HISTORICO_MONTADOR_LIMITE + 5; indice += 1) {
        historico = registrarPassoHistorico(historico, `${indice}d6`);
      }
      expect(historico).toHaveLength(HISTORICO_MONTADOR_LIMITE);
      expect(historico[0]).toBe('5d6');
    });
  });
});
