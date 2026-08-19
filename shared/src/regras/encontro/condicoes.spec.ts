import { describe, expect, it } from 'vitest';
import type { CondicaoCombatenteDto } from '../../dtos/encontro';
import { combatentePerdeTurno, expirarCondicoes } from './condicoes';

const condicao = (
  nome: string,
  rodadasRestantes: number | null,
  perdeTurno = false,
): CondicaoCombatenteDto => ({ nome, rodadasRestantes, perdeTurno });

describe('expirarCondicoes', () => {
  it('decrementa as rodadas restantes na virada', () => {
    const resultado = expirarCondicoes([condicao('Sangramento', 2)]);
    expect(resultado.condicoes).toEqual([condicao('Sangramento', 1)]);
    expect(resultado.expiradas).toEqual([]);
  });

  it('remove a condição que chegou a zero e a devolve como expirada (para o log)', () => {
    const resultado = expirarCondicoes([condicao('Suprimido', 1)]);
    expect(resultado.condicoes).toEqual([]);
    expect(resultado.expiradas).toEqual([condicao('Suprimido', 1)]);
  });

  it('condição permanente (rodadasRestantes null) nunca expira sozinha', () => {
    const resultado = expirarCondicoes([condicao('Machucado', null)]);
    expect(resultado.condicoes).toEqual([condicao('Machucado', null)]);
    expect(resultado.expiradas).toEqual([]);
  });

  it('trata a lista inteira de uma vez, preservando a ordem das sobreviventes', () => {
    const resultado = expirarCondicoes([
      condicao('Adrenalina', 3),
      condicao('Suprimido', 1),
      condicao('Sangramento', 2),
      condicao('Machucado', null),
    ]);
    expect(resultado.condicoes).toEqual([
      condicao('Adrenalina', 2),
      condicao('Sangramento', 1),
      condicao('Machucado', null),
    ]);
    expect(resultado.expiradas).toEqual([condicao('Suprimido', 1)]);
  });

  it('não muta a lista recebida', () => {
    const entrada = [condicao('Sangramento', 2)];
    expirarCondicoes(entrada);
    expect(entrada).toEqual([condicao('Sangramento', 2)]);
  });

  it('lista vazia devolve vazio', () => {
    expect(expirarCondicoes([])).toEqual({ condicoes: [], expiradas: [] });
  });
});

describe('combatentePerdeTurno', () => {
  it('perde o turno quando alguma condição marca perdeTurno', () => {
    expect(combatentePerdeTurno([condicao('Sangramento', 2), condicao('Inconsciente', null, true)])).toBe(
      true,
    );
  });

  it('não perde o turno sem nenhuma condição de perda', () => {
    expect(combatentePerdeTurno([condicao('Sangramento', 2), condicao('Machucado', null)])).toBe(false);
  });

  it('sem condições, não perde o turno', () => {
    expect(combatentePerdeTurno([])).toBe(false);
  });
});
