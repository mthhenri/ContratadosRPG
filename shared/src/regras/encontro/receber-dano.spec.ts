import { describe, expect, it } from 'vitest';
import { TipoDanoEnum } from '../../enums';
import { calcularDanoRecebido } from './receber-dano';

describe('calcularDanoRecebido', () => {
  it('reduz cada tipo bloqueável pela resistência da ficha somada à custom', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 40, [TipoDanoEnum.QUIMICO]: 20 },
      resistenciasFicha: { [TipoDanoEnum.FISICO]: 15, [TipoDanoEnum.QUIMICO]: 5 },
    });

    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.FISICO)?.efetivo).toBe(25);
    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.QUIMICO)?.efetivo).toBe(15);
    expect(resultado.total).toBe(40);
  });

  it('soma resistência custom à da ficha no mesmo tipo', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 40 },
      resistenciasFicha: { [TipoDanoEnum.FISICO]: 15 },
      resistenciasCustom: { [TipoDanoEnum.FISICO]: 5 },
    });

    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.FISICO)?.efetivo).toBe(20);
    expect(resultado.total).toBe(20);
  });

  it('nunca deixa o efetivo de um tipo negativo quando a resistência excede o bruto', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.BALISTICO]: 3 },
      resistenciasFicha: { [TipoDanoEnum.BALISTICO]: 10 },
    });

    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.BALISTICO)?.efetivo).toBe(0);
    expect(resultado.total).toBe(0);
  });

  it('resistência excedente em um tipo não compensa outro tipo', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 2, [TipoDanoEnum.QUIMICO]: 10 },
      resistenciasFicha: { [TipoDanoEnum.FISICO]: 10, [TipoDanoEnum.QUIMICO]: 0 },
    });

    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.FISICO)?.efetivo).toBe(0);
    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.QUIMICO)?.efetivo).toBe(10);
    expect(resultado.total).toBe(10);
  });

  it('aplica a resistência Geral uma única vez sobre a soma dos residuais bloqueáveis', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 10, [TipoDanoEnum.QUIMICO]: 10 },
      resistenciasFicha: { [TipoDanoEnum.GERAL]: 3 },
    });

    // residual bloqueável = 20; menos 3 de resistência Geral (uma vez, não por linha) = 17
    expect(resultado.residualPosGeral).toBe(17);
    expect(resultado.total).toBe(17);
  });

  it('soma a resistência Geral custom à da ficha', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 20 },
      resistenciasFicha: { [TipoDanoEnum.GERAL]: 2 },
      resistenciasCustom: { [TipoDanoEnum.GERAL]: 3 },
    });

    expect(resultado.residualPosGeral).toBe(15);
    expect(resultado.total).toBe(15);
  });

  it('dano Geral informado entra inteiro no total, irredutível mesmo com resistência Geral alta', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.GERAL]: 12 },
      resistenciasFicha: { [TipoDanoEnum.GERAL]: 100 },
    });

    expect(resultado.danoGeral).toBe(12);
    expect(resultado.total).toBe(12);
  });

  it('combina residual pós-Geral com dano Geral irredutível no total', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 10, [TipoDanoEnum.GERAL]: 5 },
      resistenciasFicha: { [TipoDanoEnum.FISICO]: 2, [TipoDanoEnum.GERAL]: 1 },
    });

    // Físico: 10 - 2 = 8; residual pós-Geral: 8 - 1 = 7; + 5 de Geral irredutível = 12
    expect(resultado.total).toBe(12);
  });

  it('resistência Geral maior que o residual não gera valor negativo', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 5 },
      resistenciasFicha: { [TipoDanoEnum.GERAL]: 50 },
    });

    expect(resultado.residualPosGeral).toBe(0);
    expect(resultado.total).toBe(0);
  });

  it('tipo sem bruto informado não aparece no resumo de linhas com valor', () => {
    const resultado = calcularDanoRecebido({
      brutos: { [TipoDanoEnum.FISICO]: 10 },
      resistenciasFicha: {},
    });

    expect(resultado.porTipo.filter((l) => l.bruto > 0)).toHaveLength(1);
    expect(resultado.porTipo.find((l) => l.tipo === TipoDanoEnum.BALISTICO)?.bruto).toBe(0);
  });

  it('sem nenhum valor informado, total é zero', () => {
    const resultado = calcularDanoRecebido({ brutos: {}, resistenciasFicha: {} });

    expect(resultado.total).toBe(0);
    expect(resultado.residualPosGeral).toBe(0);
    expect(resultado.danoGeral).toBe(0);
  });
});
