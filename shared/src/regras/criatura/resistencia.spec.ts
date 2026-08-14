import { describe, expect, it } from 'vitest';
import { TipoDanoEnum } from '../../enums';
import {
  calcularCustoResistencia,
  calcularLimiteResistencias,
  calcularMultiplicadorCriticoFraqueza,
  validarFraqueza,
} from './resistencia';

describe('calcularLimiteResistencias', () => {
  it('"A Estátua": VD 30, sem fraqueza extra = 60', () => {
    expect(calcularLimiteResistencias({ vd: 30, quantidadeFraquezasExtras: 0 })).toBe(60);
  });

  it('cada fraqueza extra além da 1ª soma 25% (exemplo do doc: VD 40, 2 extras → 120)', () => {
    expect(calcularLimiteResistencias({ vd: 40, quantidadeFraquezasExtras: 2 })).toBe(120);
  });
});

describe('calcularCustoResistencia', () => {
  it('tipo amplo custa o próprio valor', () => {
    expect(calcularCustoResistencia({ valor: 36, tipo: TipoDanoEnum.FISICO, ehSubtipo: false })).toBe(36);
  });

  it('Dano Geral conta em dobro', () => {
    expect(calcularCustoResistencia({ valor: 15, tipo: TipoDanoEnum.GERAL, ehSubtipo: false })).toBe(30);
  });

  it('subtipo custa metade (2 pontos gastam 1 do limite)', () => {
    expect(calcularCustoResistencia({ valor: 10, tipo: TipoDanoEnum.FISICO, ehSubtipo: true })).toBe(5);
  });
});

describe('validarFraqueza', () => {
  it('mínimo 5 quando a soma de resistências é baixa', () => {
    expect(validarFraqueza({ valor: 5, somaResistencias: 4 })).toBe(true);
    expect(validarFraqueza({ valor: 4, somaResistencias: 4 })).toBe(false);
  });

  it('mínimo é metade da soma de resistências quando maior que 5', () => {
    // "A Estátua": soma de resistências 36+16=52 → mínimo real 26. O exemplo do doc declara a
    // Fraqueza de Explosão em 20, abaixo do próprio mínimo exigido pela fórmula do mesmo
    // documento — inconsistência do exemplo, não da fórmula (ver a-estatua.spec.ts).
    expect(validarFraqueza({ valor: 20, somaResistencias: 52 })).toBe(false);
    expect(validarFraqueza({ valor: 26, somaResistencias: 52 })).toBe(true);
  });
});

describe('calcularMultiplicadorCriticoFraqueza', () => {
  it('3× tipo amplo, 4× subtipo', () => {
    expect(calcularMultiplicadorCriticoFraqueza(false)).toBe(3);
    expect(calcularMultiplicadorCriticoFraqueza(true)).toBe(4);
  });
});
