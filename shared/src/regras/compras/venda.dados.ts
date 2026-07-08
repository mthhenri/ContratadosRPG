import { FragmentoModuloEnum, FragmentoTipoEnum, TaxaVendaEnum } from '../../enums';

/**
 * Dados tipados da venda (m1-20): multiplicadores de taxa de venda de item e a
 * tabela de venda de fragmentos por módulo × tipo. Conferidos contra
 * docs/core/sistema-v4.1.0.md — "Loja" (venda por metade), "Retornando após uma
 * Missão" (entrega no check-in = 75%; item fora de patente não entregue = 25%) e
 * "Venda de Fragmentos" (tabela por módulo × tipo). Em conflito, o documento
 * vence (proibição #27).
 */

/**
 * Multiplicador aplicado ao valor (gasto) do carrinho conforme a taxa de venda.
 * Loja = metade; entrega no check-in de retorno = 75%; item fora de patente não
 * entregue, vendido depois = 25%.
 */
export const MULTIPLICADOR_TAXA_VENDA: Record<TaxaVendaEnum, number> = {
  [TaxaVendaEnum.NORMAL]: 0.5,
  [TaxaVendaEnum.CHECKIN]: 0.75,
  [TaxaVendaEnum.FORA_PATENTE]: 0.25,
};

/**
 * Valor de venda de um fragmento por módulo (I–V) × tipo (Potencializador /
 * Construtor), em dinheiro. O Módulo ∅ é negociado com o Mestre e não entra na
 * tabela. Fonte: doc — "Venda de Fragmentos".
 */
export const VENDA_FRAGMENTOS: Record<FragmentoModuloEnum, Record<FragmentoTipoEnum, number>> = {
  [FragmentoModuloEnum.V]: {
    [FragmentoTipoEnum.POTENCIALIZADOR]: 500,
    [FragmentoTipoEnum.CONSTRUTOR]: 750,
  },
  [FragmentoModuloEnum.IV]: {
    [FragmentoTipoEnum.POTENCIALIZADOR]: 1100,
    [FragmentoTipoEnum.CONSTRUTOR]: 1600,
  },
  [FragmentoModuloEnum.III]: {
    [FragmentoTipoEnum.POTENCIALIZADOR]: 2300,
    [FragmentoTipoEnum.CONSTRUTOR]: 3300,
  },
  [FragmentoModuloEnum.II]: {
    [FragmentoTipoEnum.POTENCIALIZADOR]: 4700,
    [FragmentoTipoEnum.CONSTRUTOR]: 6700,
  },
  [FragmentoModuloEnum.I]: {
    [FragmentoTipoEnum.POTENCIALIZADOR]: 10000,
    [FragmentoTipoEnum.CONSTRUTOR]: 15000,
  },
};
