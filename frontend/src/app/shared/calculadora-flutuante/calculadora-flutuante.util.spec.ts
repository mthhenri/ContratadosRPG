import { describe, expect, it } from 'vitest';

import { avaliarExpressao, formatarResultado } from './calculadora-flutuante.util';

/**
 * Prova o motor de avaliação aritmética da calculadora flutuante (m3-54): operações básicas,
 * precedência, parênteses, `%` como pós-fixo, e os erros que a UI precisa capturar (divisão por
 * zero, expressão inválida) sem derrubar o componente.
 */
describe('avaliarExpressao', () => {
  it('soma, subtrai, multiplica e divide', () => {
    expect(avaliarExpressao('2+3')).toBe(5);
    expect(avaliarExpressao('10-4')).toBe(6);
    expect(avaliarExpressao('3×4')).toBe(12);
    expect(avaliarExpressao('20÷4')).toBe(5);
  });

  it('respeita a precedência (× ÷ antes de + −)', () => {
    expect(avaliarExpressao('2+3×4')).toBe(14);
    expect(avaliarExpressao('10-8÷2')).toBe(6);
  });

  it('resolve parênteses primeiro', () => {
    expect(avaliarExpressao('(2+3)×4')).toBe(20);
    expect(avaliarExpressao('((1+2)×(3+4))')).toBe(21);
  });

  it('aceita números decimais e unário negativo', () => {
    expect(avaliarExpressao('1.5+2.5')).toBe(4);
    expect(avaliarExpressao('-5+10')).toBe(5);
    expect(avaliarExpressao('3×-2')).toBe(-6);
  });

  it('trata % como pós-fixo (divide por 100), combinável com parênteses', () => {
    expect(avaliarExpressao('50%')).toBe(0.5);
    expect(avaliarExpressao('(10+10)%')).toBeCloseTo(0.2);
  });

  it('lança erro em divisão por zero', () => {
    expect(() => avaliarExpressao('5÷0')).toThrow();
  });

  it('lança erro em expressão inválida ou vazia', () => {
    expect(() => avaliarExpressao('')).toThrow();
    expect(() => avaliarExpressao('2+')).toThrow();
    expect(() => avaliarExpressao('(2+3')).toThrow();
    expect(() => avaliarExpressao('×5')).toThrow();
  });
});

describe('formatarResultado', () => {
  it('remove lixo de ponto-flutuante', () => {
    expect(formatarResultado(0.1 + 0.2)).toBe('0.3');
  });

  it('mantém inteiros sem casas decimais', () => {
    expect(formatarResultado(42)).toBe('42');
  });
});
