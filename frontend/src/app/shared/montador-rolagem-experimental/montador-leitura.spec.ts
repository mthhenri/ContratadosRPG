import { tokenizarFormula } from '@contratados-rpg/shared/regras/rolagem';

import {
  type AmbienteMontador,
  avaliarExpressaoMontador,
  contarDadosDoPool,
  escreverValorExpressao,
  lerFormula,
  resumirFormula,
  type UsoExpressaoMontador,
} from './montador-leitura';

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
    vontade: -1,
  },
  proficiencia: 2,
  nivel: 3,
};

/** Leitura das versões novas (montador-exp-03/04): faixa e média pelo motor, frase e campo de expressão. */
describe('montador-leitura', () => {
  describe('resumirFormula — faixa e média de uma rolagem', () => {
    it('soma de dados e fixos', () => {
      expect(resumirFormula('2d6 + FOR + 1', ambiente)).toEqual({ minimo: 6, maximo: 16, media: 11 });
    });

    it('subtração inverte a faixa', () => {
      expect(resumirFormula('10 - 1d4', ambiente)).toEqual({ minimo: 6, maximo: 9, media: 7.5 });
    });

    it('manter o maior de 2d20: média 13,825', () => {
      const resumo = resumirFormula('2d20kh1', ambiente)!;
      expect(resumo.minimo).toBe(1);
      expect(resumo.maximo).toBe(20);
      expect(resumo.media).toBeCloseTo(13.825, 6);
    });

    it('teste com atributo negativo usa a regra do motor (rola 3 d20 e fica com o menor)', () => {
      const resumo = resumirFormula('VONd20kh1', ambiente)!;
      expect(contarDadosDoPool('VONd20kh1', ambiente)).toBe(3);
      // E[menor de 3d20] = Σ ((21−k)/20)³ = 5,5125.
      expect(resumo.media).toBeCloseTo(5.5125, 6);
    });

    it('manter os 2 maiores de 3d6 (estatística de ordem)', () => {
      // E[soma dos 2 maiores de 3d6] = 8,4583…
      expect(resumirFormula('3d6kh2', ambiente)!.media).toBeCloseTo(8.458333, 5);
    });

    it('soma e subtração de dados juntas: cada termo vai ao seu extremo', () => {
      // 2d6 − 1d4: mínimo 2 − 4, máximo 12 − 1.
      expect(resumirFormula('2d6 - 1d4', ambiente)).toEqual({ minimo: -2, maximo: 11, media: 4.5 });
      expect(resumirFormula('(2d6 - 1d4)#3', ambiente)).toEqual({ minimo: -2, maximo: 11, media: 4.5 });
    });

    it('explosão ou implosão não têm faixa (sem teto ou piso)', () => {
      expect(resumirFormula('2d6!', ambiente)).toBeNull();
      expect(resumirFormula('2d6?', ambiente)).toBeNull();
    });

    it('conta na quantidade de dados usa os valores da ficha', () => {
      expect(resumirFormula('((FOR+VIG)*2)d4', ambiente)).toEqual({ minimo: 14, maximo: 56, media: 35 });
    });

    it('dado na quantidade: cada soma possível entra com a sua probabilidade', () => {
      expect(resumirFormula('(1d6)d20', ambiente)).toEqual({ minimo: 1, maximo: 120, media: 36.75 });
      // 1d6−3 dá 0,0,0,1,2,3 dados de 6 (sem kh, trava em 0).
      expect(resumirFormula('(1d6-3)d6', ambiente)).toEqual({ minimo: 0, maximo: 18, media: 3.5 });
      const teste = resumirFormula('(1d6)d20kh1', ambiente)!;
      expect([teste.minimo, teste.maximo]).toEqual([1, 20]);
      expect(teste.media).toBeGreaterThan(10.5);
      expect(teste.media).toBeLessThan(resumirFormula('6d20kh1', ambiente)!.media);
    });

    it('dados demais na conta de quantidade ficam sem resumo', () => {
      expect(resumirFormula('(2d100*2d100)d6', ambiente)).toBeNull();
    });

    it('fórmula inválida não tem resumo', () => {
      expect(resumirFormula('2d6+', ambiente)).toBeNull();
    });
  });

  describe('avaliarExpressaoMontador — leitura ao vivo do campo de expressão', () => {
    it('quantidade de dados: (FOR+VIG)*2 = 14 dados', () => {
      expect(avaliarExpressaoMontador(' (for + vig) * 2 ', { tipo: 'QUANTIDADE', faces: 4 }, ambiente)).toEqual({
        valida: true,
        minimo: 14,
        maximo: 14,
        texto: '(FOR+VIG)*2',
      });
    });

    it('bônus fixo, com piso no fim e PROF/NIV', () => {
      expect(avaliarExpressaoMontador('(INT+SOC)/2', { tipo: 'BONUS' }, ambiente)).toMatchObject({ minimo: 5, maximo: 5 });
      expect(avaliarExpressaoMontador('2*(LUT+PROF)', { tipo: 'BONUS' }, ambiente)).toMatchObject({ minimo: 12, maximo: 12 });
      expect(avaliarExpressaoMontador('NIV-10', { tipo: 'BONUS' }, ambiente)).toMatchObject({ minimo: -7, maximo: -7 });
    });

    it('quantidade com dado: a faixa de dados que a conta pode dar', () => {
      expect(avaliarExpressaoMontador('1d6', { tipo: 'QUANTIDADE', faces: 20 }, ambiente)).toEqual({
        valida: true,
        minimo: 1,
        maximo: 6,
        texto: '1D6',
      });
      expect(avaliarExpressaoMontador('1d4 + for', { tipo: 'QUANTIDADE', faces: 6 }, ambiente)).toMatchObject({
        minimo: 4,
        maximo: 7,
      });
    });

    it('escreve o valor lido para a tela', () => {
      const ler = (expressao: string, uso: UsoExpressaoMontador) => {
        const avaliada = avaliarExpressaoMontador(expressao, uso, ambiente);
        return avaliada.valida ? escreverValorExpressao(avaliada, uso.tipo) : avaliada.erro;
      };
      expect(ler('(FOR+VIG)*2', { tipo: 'QUANTIDADE', faces: 4 })).toBe('14 dados');
      expect(ler('1', { tipo: 'QUANTIDADE', faces: 4 })).toBe('1 dado');
      expect(ler('1d6', { tipo: 'QUANTIDADE', faces: 20 })).toBe('1 a 6 dados');
      expect(ler('(INT+SOC)/2', { tipo: 'BONUS' })).toBe('+5');
      expect(ler('NIV-10', { tipo: 'BONUS' })).toBe('-7');
    });

    it('recusa dado no bônus fixo, conta vazia e erro de leitura', () => {
      expect(avaliarExpressaoMontador('2d6', { tipo: 'BONUS' }, ambiente)).toEqual({
        valida: false,
        erro: 'O bônus fixo não aceita dados — só números, atributos, PROF e NIV.',
      });
      expect(avaliarExpressaoMontador('', { tipo: 'BONUS' }, ambiente).valida).toBe(false);
      expect(avaliarExpressaoMontador('(FOR+', { tipo: 'QUANTIDADE', faces: 6 }, ambiente).valida).toBe(false);
    });
  });

  describe('lerFormula — frase em português', () => {
    it('dano com tipo, atributo com valor, subtração e repetição', () => {
      expect(lerFormula(tokenizarFormula('(2d6 + FOR [F] - 1d4 [Q])#2')!, ambiente)).toBe(
        '2 rolagens de: 2d6 de Físico + Força (3) de Físico − 1d4 de Químico',
      );
    });

    it('teste: quantidade pela conta, manter e crítico', () => {
      expect(lerFormula(tokenizarFormula('((Int+soc)/2)d20kh1cm1+prof')!, ambiente)).toBe(
        '5 d20 ((INT+SOC)/2), fica com o maior, crítico no 20 + Proficiência (2)',
      );
      expect(lerFormula(tokenizarFormula('LUTd20kh1cm2')!, ambiente)).toBe(
        '4 d20 (Luta), fica com o maior, crítico de 19 a 20',
      );
      expect(lerFormula(tokenizarFormula('(1d6)d20kh1')!, ambiente)).toBe('1 a 6 d20 (1D6), fica com o maior');
    });

    it('composto, conta de bônus e atalho com o valor atual', () => {
      expect(
        lerFormula(tokenizarFormula('CORPO + 2d6 [F-Q] + (FOR+VIG)*2')!, ambiente, { corpo: '2D6 [Físico]' }),
      ).toBe('dano Corpo a corpo (2D6 [Físico]) + 2d6 de Físico e Químico, meio a meio + (FOR+VIG)*2 (14)');
    });
  });
});
