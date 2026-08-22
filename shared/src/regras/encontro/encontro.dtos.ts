import type { CadenciaEnum } from '../../enums';

/**
 * DTOs de entrada do motor puro do Encontro de Combate (m7-02). Deliberadamente **magros**: o
 * motor só precisa do que decide ordem e turno, não da ficha inteira — quem monta o estado
 * completo é o service (`EncontroCombatenteResumoDto`, `shared/dtos/encontro`).
 */

/**
 * Combatente do ponto de vista da **ordenação**. `iniciativa` já vem somada (rolagem + bônus): o
 * cálculo é do motor de rolagem/ficha, não daqui. `destreza` é a Destreza efetiva, usada só como
 * desempate. `cadencia` decide quantos turnos ele tem na rodada.
 */
export interface CombatenteOrdenavelDto {
  readonly id: number;
  readonly iniciativa: number;
  readonly destreza: number;
  readonly cadencia: CadenciaEnum;
  /** Valor declarado pelo Mestre; só varia livremente na Cadência Frenética (mínimo 4). */
  readonly turnosPorRodada?: number;
}
