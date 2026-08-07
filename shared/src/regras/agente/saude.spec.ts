import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularEnergia, calcularLimiteEnergia, calcularVida, obterSaudeClasse } from './saude';

/**
 * Fórmulas de saúde do agente conferidas contra docs/core/sistema-v4.1.0.md —
 * blocos de classe ("⬦ Saúde" / "⬦ Progressão por Nível") e "Jogando como um
 * Civil" > "Saúde".
 */
describe('calcularVida', () => {
  it('Combatente: Vida = 30 + VIG×4, progressão 7 + VIG×2 por Nível', () => {
    expect(calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 0, vigor: 0 })).toBe(30);
    expect(calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 0, vigor: 2 })).toBe(38);
    // 38 + 5 × (7 + 2×2) = 38 + 55
    expect(calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 5, vigor: 2 })).toBe(93);
  });

  it('Especialista: Vida = 20 + VIG×3, progressão 4 + VIG×2', () => {
    expect(calcularVida({ classe: ClasseEnum.ESPECIALISTA, nivel: 0, vigor: 0 })).toBe(20);
    // (20 + 3×3) + 4 × (4 + 3×2) = 29 + 40
    expect(calcularVida({ classe: ClasseEnum.ESPECIALISTA, nivel: 4, vigor: 3 })).toBe(69);
  });

  it('Suporte: Vida = 25 + VIG×3, progressão 5 + VIG×2', () => {
    expect(calcularVida({ classe: ClasseEnum.SUPORTE, nivel: 0, vigor: 0 })).toBe(25);
    // (25 + 3×1) + 2 × (5 + 1×2) = 28 + 14
    expect(calcularVida({ classe: ClasseEnum.SUPORTE, nivel: 2, vigor: 1 })).toBe(42);
  });

  it('Experimento Bestial: Vida = 30 + VIG×5, progressão 9 + VIG×2', () => {
    expect(calcularVida({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, nivel: 0, vigor: 0 })).toBe(30);
    // (30 + 5×2) + 3 × (9 + 2×2) = 40 + 39
    expect(calcularVida({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, nivel: 3, vigor: 2 })).toBe(79);
  });

  it('Experimento Artificial: Vida = 27 + VIG×3, progressão 5 + VIG×2', () => {
    expect(calcularVida({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, nivel: 0, vigor: 0 })).toBe(27);
    // (27 + 3×1) + 10 × (5 + 1×2) = 30 + 70
    expect(calcularVida({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, nivel: 10, vigor: 1 })).toBe(100);
  });

  it('Experimento Híbrido: Vida = 25 + VIG×4, progressão 7 + VIG×2', () => {
    expect(calcularVida({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, nivel: 0, vigor: 0 })).toBe(25);
    // (25 + 4×2) + 2 × (7 + 2×2) = 33 + 22
    expect(calcularVida({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, nivel: 2, vigor: 2 })).toBe(55);
  });

  it('Civil: Vida = 10 + VIG, progressão VIG por Treinamento', () => {
    expect(calcularVida({ classe: ClasseEnum.CIVIL, nivel: 0, vigor: 1 })).toBe(11);
    // (10 + 1) + 5 × 1
    expect(calcularVida({ classe: ClasseEnum.CIVIL, nivel: 5, vigor: 1 })).toBe(16);
    // (10 + 2) + 3 × 2
    expect(calcularVida({ classe: ClasseEnum.CIVIL, nivel: 3, vigor: 2 })).toBe(18);
  });

  it('permite Vigor negativo (sem clamp — normalização é responsabilidade de aplicarLimitesPorClasse)', () => {
    // Combatente: (30 + (-5)×4) + 0 = 10
    expect(calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 0, vigor: -5 })).toBe(10);
  });
});

describe('calcularEnergia', () => {
  it('Combatente: Energia = 15 + DES×2, progressão 4 + DES×2', () => {
    expect(calcularEnergia({ classe: ClasseEnum.COMBATENTE, nivel: 0, destreza: 0 })).toBe(15);
    // (15 + 2×2) + 5 × (4 + 2×2) = 19 + 40
    expect(calcularEnergia({ classe: ClasseEnum.COMBATENTE, nivel: 5, destreza: 2 })).toBe(59);
  });

  it('Especialista: Energia = 22 + DES×3, progressão 7 + DES×2', () => {
    // (22 + 3×3) + 4 × (7 + 3×2) = 31 + 52
    expect(calcularEnergia({ classe: ClasseEnum.ESPECIALISTA, nivel: 4, destreza: 3 })).toBe(83);
  });

  it('Suporte: Energia = 18 + DES×2, progressão 6 + DES×2', () => {
    expect(calcularEnergia({ classe: ClasseEnum.SUPORTE, nivel: 0, destreza: 0 })).toBe(18);
  });

  it('Experimento Bestial: Energia = 22 + DES×2, progressão 5 + DES×2', () => {
    expect(calcularEnergia({ classe: ClasseEnum.EXPERIMENTO_BESTIAL, nivel: 0, destreza: 0 })).toBe(22);
  });

  it('Experimento Artificial: Energia = 22 + DES×4, progressão 9 + DES×2', () => {
    // (22 + 4×1) + 1 × (9 + 1×2) = 26 + 11
    expect(calcularEnergia({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, nivel: 1, destreza: 1 })).toBe(37);
  });

  it('Experimento Híbrido: Energia = 18 + DES×3, progressão 7 + DES×2', () => {
    expect(calcularEnergia({ classe: ClasseEnum.EXPERIMENTO_HIBRIDO, nivel: 0, destreza: 0 })).toBe(18);
  });

  it('Civil: Energia = 5 + DES×2, progressão DES por Treinamento', () => {
    expect(calcularEnergia({ classe: ClasseEnum.CIVIL, nivel: 0, destreza: 1 })).toBe(7);
    // (5 + 1×2) + 5 × 1
    expect(calcularEnergia({ classe: ClasseEnum.CIVIL, nivel: 5, destreza: 1 })).toBe(12);
  });
});

describe('calcularLimiteEnergia', () => {
  // DIVERGÊNCIA vs script.js: o site antigo calculava (Vigor + Destreza) × 2.
  // O documento (sistema-v4.1.0.md — "Limites de Energia" e "Jogando como um
  // Civil") define Destreza × 2 (agente) e Destreza (civil). Documento vence
  // (proibição #27).
  it('agente: Limite de Energia = Destreza × 2', () => {
    expect(calcularLimiteEnergia({ classe: ClasseEnum.COMBATENTE, destreza: 3 })).toBe(6);
    expect(calcularLimiteEnergia({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, destreza: 0 })).toBe(0);
  });

  it('civil: Limite de Energia = Destreza', () => {
    expect(calcularLimiteEnergia({ classe: ClasseEnum.CIVIL, destreza: 3 })).toBe(3);
  });
});

describe('obterSaudeClasse', () => {
  it('Combatente: expõe os mesmos coeficientes usados por calcularVida/calcularEnergia', () => {
    expect(obterSaudeClasse({ classe: ClasseEnum.COMBATENTE })).toEqual({
      vidaBase: 30, vidaPorNivel: 7, vidaPorVigor: 4,
      energiaBase: 15, energiaPorNivel: 4, energiaPorDestreza: 2,
    });
  });

  it('Civil: base e progressão bem menores que qualquer classe de agente', () => {
    expect(obterSaudeClasse({ classe: ClasseEnum.CIVIL })).toEqual({
      vidaBase: 10, vidaPorNivel: 0, vidaPorVigor: 1,
      energiaBase: 5, energiaPorNivel: 0, energiaPorDestreza: 2,
    });
  });
});
