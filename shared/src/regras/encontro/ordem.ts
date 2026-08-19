import type { OrdemTurnoDto } from '../../dtos/encontro';
import { CadenciaEnum } from '../../enums';
import type { CombatenteOrdenavelDto } from './encontro.dtos';

/**
 * Turnos por rodada de cada Cadência (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de
 * Ameaças" > "Cadência"). Frenética é "4+" no documento: o motor adota 4 como o valor concreto,
 * deixando qualquer excepcionalidade acima disso para decisão do Mestre na mesa.
 */
const TURNOS_POR_CADENCIA: Record<CadenciaEnum, number> = {
  [CadenciaEnum.SINGULAR]: 1,
  [CadenciaEnum.DUPLA]: 2,
  [CadenciaEnum.TRIPLICE]: 3,
  [CadenciaEnum.FRENETICA]: 4,
};

/** Quantos turnos o combatente possui na rodada. Quem não é criatura é sempre Singular. */
export function calcularTurnosPorRodada(cadencia: CadenciaEnum): number {
  return TURNOS_POR_CADENCIA[cadencia];
}

/**
 * Ordena os combatentes por **iniciativa decrescente**. Desempate: maior **Destreza efetiva**;
 * persistindo o empate, preserva a ordem de entrada (ordenação estável) — o sistema não fixa um
 * terceiro critério, então o ajuste fino fica com o Mestre.
 *
 * Não muta a lista recebida.
 */
export function ordenarIniciativa(
  combatentes: readonly CombatenteOrdenavelDto[],
): readonly CombatenteOrdenavelDto[] {
  return [...combatentes].sort((primeiro, segundo) => {
    if (primeiro.iniciativa !== segundo.iniciativa) {
      return segundo.iniciativa - primeiro.iniciativa;
    }
    return segundo.destreza - primeiro.destreza;
  });
}

/**
 * Monta a sequência de turnos da rodada a partir dos combatentes **já ordenados**, aplicando a
 * **Intercalação na Iniciativa** (`guia_de_mestre-v4.0.0.md`): os turnos extras de uma criatura
 * "não se acumulam em sequência: eles são distribuídos entre os turnos dos agentes. O segundo
 * turno de uma criatura cai sempre no **próximo slot disponível** abaixo de sua posição na ordem
 * de iniciativa".
 *
 * O algoritmo percorre os turnos-base (a primeira ocorrência de cada combatente, na ordem de
 * iniciativa) e, **depois de cada um**, entrega no máximo um turno extra pendente — é isso que
 * torna o slot "disponível": um extra nunca ocupa o slot que outro extra já tomou, e nunca cai
 * colado à ocorrência anterior do mesmo combatente. Ao emitir qualquer ocorrência, a próxima
 * daquele combatente entra na fila.
 *
 * Quando os turnos-base acabam antes dos extras (ex.: Frenética com poucos combatentes), o
 * excedente é drenado no fim da rodada: a adjacência passa a ser inevitável e o motor não inventa
 * slots para escondê-la.
 */
export function intercalarCadencia(
  ordenados: readonly CombatenteOrdenavelDto[],
): readonly OrdemTurnoDto[] {
  const totalDeTurnos = new Map<number, number>(
    ordenados.map((combatente) => [combatente.id, calcularTurnosPorRodada(combatente.cadencia)]),
  );
  const ordem: OrdemTurnoDto[] = [];
  const pendentes: OrdemTurnoDto[] = [];

  /** Emite a ocorrência e agenda a seguinte do mesmo combatente, se ela existir. */
  const emitir = (slot: OrdemTurnoDto): void => {
    ordem.push(slot);
    const total = totalDeTurnos.get(slot.combatenteId) ?? 1;
    if (slot.ocorrencia < total) {
      pendentes.push({ combatenteId: slot.combatenteId, ocorrencia: slot.ocorrencia + 1 });
    }
  };

  for (const combatente of ordenados) {
    // O turno-base entra primeiro; só depois dele um extra pendente ganha o slot seguinte, para
    // que o extra caia sempre ABAIXO da posição de quem o gerou.
    ordem.push({ combatenteId: combatente.id, ocorrencia: 1 });
    const extraPendente = pendentes.shift();
    if (extraPendente) {
      emitir(extraPendente);
    }
    if ((totalDeTurnos.get(combatente.id) ?? 1) > 1) {
      pendentes.push({ combatenteId: combatente.id, ocorrencia: 2 });
    }
  }

  while (pendentes.length > 0) {
    emitir(pendentes.shift() as OrdemTurnoDto);
  }

  return ordem;
}
