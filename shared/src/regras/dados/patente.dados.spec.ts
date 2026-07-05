import { describe, expect, it } from 'vitest';
import { PatenteEnum } from '../../enums';
import { PATENTES } from './patente.dados';

/**
 * Prova de harness: valida que o pipeline de teste do workspace `shared`
 * funciona ponta a ponta antes de qualquer fórmula de domínio (m1-02+).
 */
describe('PATENTES', () => {
  it('contém as 8 patentes em ordem crescente de prestígio, de Agente a Líder Operacional', () => {
    expect(PATENTES).toHaveLength(8);
    expect(PATENTES[0].patente).toBe(PatenteEnum.AGENTE);
    expect(PATENTES[PATENTES.length - 1].patente).toBe(PatenteEnum.LIDER_OPERACIONAL);
  });

  it('encontra a patente correspondente a um prestígio dentro da faixa', () => {
    const patenteEncontrada = PATENTES.find(
      (patenteDados) => 12 >= patenteDados.prestigioMinimo && 12 <= patenteDados.prestigioMaximo,
    );

    expect(patenteEncontrada?.patente).toBe(PatenteEnum.VETERANO);
  });
});
