/**
 * Taxa aplicada na venda de um item à Fundação. Conteúdo de jogo — sem tabela
 * `tipo_*` (§10.3). Fonte: docs/core/sistema-v4.1.0.md — "Loja" (venda por
 * metade), "Retornando após uma Missão" (entrega no check-in = 75%; item fora
 * de patente não entregue = 25%).
 */
export enum TaxaVendaEnum {
  /** Venda comum na Loja: metade do valor original. */
  NORMAL = 'NORMAL',
  /** Entrega no check-in de retorno de missão: 75% do valor. */
  CHECKIN = 'CHECKIN',
  /** Item fora da patente não entregue, vendido depois: 25% do valor. */
  FORA_PATENTE = 'FORA_PATENTE',
}
