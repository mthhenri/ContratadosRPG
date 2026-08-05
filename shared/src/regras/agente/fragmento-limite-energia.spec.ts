import { describe, expect, it } from 'vitest';
import {
  emAnomaliaBiologica,
  limiteMinimoEnergiaMaximaFragmentos,
  PENALIDADE_DEFESA_ANOMALIA_BIOLOGICA,
  PENALIDADE_TESTES_ANOMALIA_BIOLOGICA,
  TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO,
  TRAUMA_LIMIAR_HUMANIDADE_NOME,
  tetoVidaAnomaliaBiologica,
} from './fragmento-limite-energia';

/**
 * `limiteMinimoEnergiaMaximaFragmentos`/`emAnomaliaBiologica` conferidas contra
 * `docs/core/sistema-v4.1.0.md` — "⬥ Afinidade com Fragmentos" > "⬦ Limite mínimo de Energia" (m3-67).
 */
describe('limiteMinimoEnergiaMaximaFragmentos', () => {
  it('(Vigor + Destreza) × 2', () => {
    expect(limiteMinimoEnergiaMaximaFragmentos({ vigor: 3, destreza: 2 })).toBe(10);
  });

  it('zero em ambos os atributos: limite zero', () => {
    expect(limiteMinimoEnergiaMaximaFragmentos({ vigor: 0, destreza: 0 })).toBe(0);
  });

  it('não colide com o resultado de `calcularLimiteEnergia` (Destreza × 2) — fórmulas diferentes', () => {
    // Vigor 3 + Destreza 2: calcularLimiteEnergia daria 4 (Destreza × 2); aqui dá 10.
    expect(limiteMinimoEnergiaMaximaFragmentos({ vigor: 3, destreza: 2 })).not.toBe(2 * 2);
  });
});

describe('emAnomaliaBiologica', () => {
  it('Energia Máxima atual abaixo do limite: true', () => {
    expect(emAnomaliaBiologica(9, 10)).toBe(true);
  });

  it('Energia Máxima atual igual ao limite: false (só abaixo entra no estado)', () => {
    expect(emAnomaliaBiologica(10, 10)).toBe(false);
  });

  it('Energia Máxima atual acima do limite: false', () => {
    expect(emAnomaliaBiologica(11, 10)).toBe(false);
  });
});

describe('tetoVidaAnomaliaBiologica', () => {
  it('10% da Vida Máxima, arredondado pra baixo', () => {
    expect(tetoVidaAnomaliaBiologica(80)).toBe(8);
    expect(tetoVidaAnomaliaBiologica(85)).toBe(8);
  });

  it('Vida Máxima zero: teto zero', () => {
    expect(tetoVidaAnomaliaBiologica(0)).toBe(0);
  });
});

describe('constantes de efeito e do trauma "Limiar da Humanidade"', () => {
  it('penalidades fixas do doc', () => {
    expect(PENALIDADE_TESTES_ANOMALIA_BIOLOGICA).toBe(-15);
    expect(PENALIDADE_DEFESA_ANOMALIA_BIOLOGICA).toBe(-10);
  });

  it('nome e descrição do trauma prontos pro atalho de registro', () => {
    expect(TRAUMA_LIMIAR_HUMANIDADE_NOME).toBe('Limiar da Humanidade');
    expect(TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO).toContain('+2');
    expect(TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO).toContain('-5');
    expect(TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO).toContain('3×');
  });
});
