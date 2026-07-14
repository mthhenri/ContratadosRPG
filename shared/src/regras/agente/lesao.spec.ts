import { describe, expect, it } from 'vitest';

import { ClasseEnum, SeveridadeLesaoEnum } from '../../enums';
import type { FichaAtributosDto, FichaLesaoDto } from '../../dtos/ficha';
import {
  calcularAtributoEfetivo,
  calcularAtributosEfetivos,
  somarLesoesAtributo,
} from './lesao';
import { maestriaValida } from './maestria';
import { calcularVida } from './saude';

/**
 * Prova o efeito mecânico das lesões nos atributos (`sistema-v4.1.0.md` — "⬡ Lesões"): removem pontos
 * do atributo afetado (efetivo = base − pontos, **sem piso — pode negativar**), **sem mutar o base** —
 * de modo que a Maestria, ligada ao base, sobrevive à lesão.
 */
describe('lesão → atributo efetivo', () => {
  const base: FichaAtributosDto = {
    destreza: 2,
    forca: 6,
    luta: 2,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 2,
  };

  const lesao = (
    atributo: keyof FichaAtributosDto,
    pontos: number,
  ): FichaLesaoDto => ({ atributo, pontos, severidade: SeveridadeLesaoEnum.LEVE, permanente: false });

  it('soma os pontos de lesão de um atributo (acumula várias)', () => {
    const lesoes = [lesao('forca', 1), lesao('forca', 2), lesao('vigor', 3)];
    expect(somarLesoesAtributo(lesoes, 'forca')).toBe(3);
    expect(somarLesoesAtributo(lesoes, 'vigor')).toBe(3);
    expect(somarLesoesAtributo(lesoes, 'luta')).toBe(0);
  });

  it('atributo efetivo = base − pontos, sem piso (negativa)', () => {
    expect(calcularAtributoEfetivo(6, [lesao('forca', 1)], 'forca')).toBe(5);
    // Sem piso: lesão maior que o base negativa o atributo.
    expect(calcularAtributoEfetivo(2, [lesao('forca', 5)], 'forca')).toBe(-3);
    expect(calcularAtributoEfetivo(0, [lesao('forca', 1)], 'forca')).toBe(-1);
    // Sem lesão no atributo → base intacto.
    expect(calcularAtributoEfetivo(4, [lesao('vigor', 3)], 'forca')).toBe(4);
  });

  it('mapa efetivo reduz só os atributos lesionados e preserva o resto', () => {
    const efetivos = calcularAtributosEfetivos(base, [lesao('forca', 1), lesao('vigor', 2)]);
    expect(efetivos.forca).toBe(5);
    expect(efetivos.vigor).toBe(2);
    expect(efetivos.destreza).toBe(2);
    // O base não é mutado.
    expect(base.forca).toBe(6);
  });

  it('o mapa efetivo negativa o atributo quando a lesão excede o base', () => {
    const efetivos = calcularAtributosEfetivos(base, [lesao('vigor', 7)]);
    expect(efetivos.vigor).toBe(-3);
    expect(base.vigor).toBe(4);
  });

  it('Vigor negativado por lesão permanente derruba a Vida máxima (cascata do doc)', () => {
    // Combatente nível 2, Vigor base 4 → o efetivo cai a −1 com 5 pontos de lesão permanente.
    const permanentes = [
      { ...lesao('vigor', 5), permanente: true, severidade: SeveridadeLesaoEnum.MORTAL },
    ];
    const efetivos = calcularAtributosEfetivos(base, permanentes);
    expect(efetivos.vigor).toBe(-1);

    const entrada = { classe: ClasseEnum.COMBATENTE, nivel: 2 };
    // Vida = 30 + Vigor×4 + Nível×(7 + Vigor×2) → o Vigor negativo entra na conta.
    expect(calcularVida({ ...entrada, vigor: base.vigor })).toBe(76);
    expect(calcularVida({ ...entrada, vigor: efetivos.vigor })).toBe(36);
  });

  it('a Maestria (ligada ao base) sobrevive à lesão — 6 com Maestria e −1 continua válida', () => {
    // Força 6 com Maestria; toma −1 de lesão → efetivo 5, mas o base segue 6.
    const lesoes = [lesao('forca', 1)];
    const efetivos = calcularAtributosEfetivos(base, lesoes);
    expect(efetivos.forca).toBe(5);
    // A validação de Maestria roda sobre o BASE (não o efetivo) → permanece válida.
    expect(maestriaValida(base, 'forca')).toBe(true);
    // (Se rodasse sobre o efetivo, cairia — o que NÃO deve acontecer.)
    expect(maestriaValida(efetivos, 'forca')).toBe(false);
  });
});
