import { describe, expect, it } from 'vitest';
import { TenacidadeEnum } from '../../enums';
import { calcularVidaMaxima, recalcularVitalidadeCriatura } from './saude';

describe('calcularVidaMaxima', () => {
  it('"A Estátua": VD 30 × Tenacidade Padrão (×35) = 1.050', () => {
    expect(calcularVidaMaxima({ vd: 30, tenacidade: TenacidadeEnum.PADRAO })).toBe(1050);
  });

  it('multiplicador das sete Tenacidades', () => {
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.DESCARTAVEL })).toBe(100);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.FRAGIL })).toBe(250);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.PADRAO })).toBe(350);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.ROBUSTA })).toBe(550);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.RESISTENTE })).toBe(750);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.IMPLACAVEL })).toBe(1000);
    expect(calcularVidaMaxima({ vd: 10, tenacidade: TenacidadeEnum.ABSOLUTA })).toBe(1200);
  });
});

// Guia de mestre ("Saúde": Vida Máxima = VD × Multiplicador; "Defesa": 15 + VD ÷ 2) aplicado à
// ficha já criada quando VD ou Tenacidade mudam (decisão do autor, 2026-11-26).
describe('recalcularVitalidadeCriatura', () => {
  it('O Ausente sobe de VD 30 para 45 (Robusta ×55): Vida 1.650 → 2.475, Defesa 30 → 37', () => {
    expect(
      recalcularVitalidadeCriatura({ vd: 45, tenacidade: TenacidadeEnum.ROBUSTA, vidaMaxima: 1650, vidaAtual: 1650 }),
    ).toEqual({ vidaMaxima: 2475, vidaAtual: 2475, defesa: 37 });
  });

  it('a Vida atual anda a mesma diferença da máxima (ferida continua ferida)', () => {
    expect(
      recalcularVitalidadeCriatura({ vd: 45, tenacidade: TenacidadeEnum.ROBUSTA, vidaMaxima: 1650, vidaAtual: 1000 }),
    ).toMatchObject({ vidaAtual: 1825 });
  });

  it('descer a VD nunca deixa a Vida atual negativa', () => {
    expect(
      recalcularVitalidadeCriatura({ vd: 5, tenacidade: TenacidadeEnum.ROBUSTA, vidaMaxima: 1650, vidaAtual: 100 }),
    ).toEqual({ vidaMaxima: 275, vidaAtual: 0, defesa: 17 });
  });

  it('sobrescreve Vida Máxima ajustada à mão pela fórmula', () => {
    expect(
      recalcularVitalidadeCriatura({ vd: 30, tenacidade: TenacidadeEnum.PADRAO, vidaMaxima: 1200, vidaAtual: 1200 }),
    ).toEqual({ vidaMaxima: 1050, vidaAtual: 1050, defesa: 30 });
  });
});
