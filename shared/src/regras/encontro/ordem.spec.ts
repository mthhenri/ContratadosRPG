import { describe, expect, it } from 'vitest';
import { CadenciaEnum } from '../../enums';
import type { CombatenteOrdenavelDto } from './encontro.dtos';
import { calcularTurnosPorRodada, intercalarCadencia, ordenarIniciativa } from './ordem';

/** Atalho de leitura: descreve a sequência como `id:ocorrencia`. */
const sequencia = (ordem: readonly { combatenteId: number; ocorrencia: number }[]): string =>
  ordem.map((slot) => `${slot.combatenteId}:${slot.ocorrencia}`).join(' → ');

const combatente = (
  id: number,
  iniciativa: number,
  cadencia: CadenciaEnum = CadenciaEnum.SINGULAR,
  destreza = 0,
): CombatenteOrdenavelDto => ({ id, iniciativa, destreza, cadencia });

describe('calcularTurnosPorRodada', () => {
  it('mapeia a Cadência do guia: Singular 1, Dupla 2, Tríplice 3, Frenética 4', () => {
    expect(calcularTurnosPorRodada(CadenciaEnum.SINGULAR)).toBe(1);
    expect(calcularTurnosPorRodada(CadenciaEnum.DUPLA)).toBe(2);
    expect(calcularTurnosPorRodada(CadenciaEnum.TRIPLICE)).toBe(3);
    expect(calcularTurnosPorRodada(CadenciaEnum.FRENETICA)).toBe(4);
  });
});

describe('ordenarIniciativa', () => {
  it('ordena por iniciativa decrescente', () => {
    const ordenados = ordenarIniciativa([combatente(1, 3), combatente(2, 18), combatente(3, 17)]);
    expect(ordenados.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it('desempata pela maior Destreza efetiva', () => {
    const ordenados = ordenarIniciativa([
      combatente(1, 15, CadenciaEnum.SINGULAR, 2),
      combatente(2, 15, CadenciaEnum.SINGULAR, 5),
    ]);
    expect(ordenados.map((c) => c.id)).toEqual([2, 1]);
  });

  it('empate de iniciativa E de Destreza preserva a ordem de entrada (estável)', () => {
    const ordenados = ordenarIniciativa([
      combatente(7, 15, CadenciaEnum.SINGULAR, 3),
      combatente(4, 15, CadenciaEnum.SINGULAR, 3),
      combatente(9, 15, CadenciaEnum.SINGULAR, 3),
    ]);
    expect(ordenados.map((c) => c.id)).toEqual([7, 4, 9]);
  });

  it('não muta a lista recebida', () => {
    const entrada = [combatente(1, 3), combatente(2, 18)];
    ordenarIniciativa(entrada);
    expect(entrada.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe('intercalarCadencia', () => {
  it('respeita o valor declarado para uma Cadência Frenética acima de 4', () => {
    const criatura = {
      ...combatente(1, 18, CadenciaEnum.FRENETICA),
      turnosPorRodada: 6,
    } as CombatenteOrdenavelDto;

    const ordem = intercalarCadencia(ordenarIniciativa([criatura, combatente(2, 10)]));

    expect(ordem.filter((turno) => turno.combatenteId === criatura.id)).toHaveLength(6);
  });

  it('reproduz o exemplo canônico do guia: Criatura Dupla [18], Agente A [17], Agente B [3]', () => {
    // docs/core/guia_de_mestre-v4.0.0.md — "Intercalação na Iniciativa":
    // "A ordem fica: Criatura [18] → Agente A [17] → Criatura [segundo turno] → Agente B [3]."
    const criatura = combatente(1, 18, CadenciaEnum.DUPLA);
    const agenteA = combatente(2, 17);
    const agenteB = combatente(3, 3);

    const ordem = intercalarCadencia(ordenarIniciativa([agenteB, criatura, agenteA]));

    expect(sequencia(ordem)).toBe('1:1 → 2:1 → 1:2 → 3:1');
  });

  it('Singular em todos: a ordem é a própria iniciativa, uma ocorrência cada', () => {
    const ordem = intercalarCadencia(
      ordenarIniciativa([combatente(1, 20), combatente(2, 10), combatente(3, 5)]),
    );
    expect(sequencia(ordem)).toBe('1:1 → 2:1 → 3:1');
  });

  it('Tríplice cascateia para baixo, sem turnos em sequência', () => {
    const ordem = intercalarCadencia(
      ordenarIniciativa([
        combatente(1, 18, CadenciaEnum.TRIPLICE),
        combatente(2, 17),
        combatente(3, 10),
        combatente(4, 3),
      ]),
    );
    expect(sequencia(ordem)).toBe('1:1 → 2:1 → 1:2 → 3:1 → 1:3 → 4:1');
  });

  it('duas criaturas de Cadência múltipla se intercalam sem colidir', () => {
    const ordem = intercalarCadencia(
      ordenarIniciativa([
        combatente(1, 20, CadenciaEnum.DUPLA),
        combatente(2, 15, CadenciaEnum.DUPLA),
        combatente(3, 10),
        combatente(4, 5),
      ]),
    );
    // Cada segundo turno cai um slot abaixo do primeiro, na ordem de iniciativa.
    expect(sequencia(ordem)).toBe('1:1 → 2:1 → 1:2 → 3:1 → 2:2 → 4:1');
  });

  it('sem slots abaixo suficientes, o excedente vai para o fim da rodada', () => {
    // Frenética (4 turnos) com só mais um combatente: a adjacência é inevitável — o motor não
    // inventa slots, apenas empurra o excedente para o fim.
    const ordem = intercalarCadencia(
      ordenarIniciativa([combatente(1, 18, CadenciaEnum.FRENETICA), combatente(2, 10)]),
    );
    expect(sequencia(ordem)).toBe('1:1 → 2:1 → 1:2 → 1:3 → 1:4');
  });

  it('lista vazia devolve ordem vazia', () => {
    expect(intercalarCadencia([])).toEqual([]);
  });
});
