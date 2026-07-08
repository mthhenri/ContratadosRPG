import { FragmentoModuloEnum, FragmentoTipoEnum, TaxaVendaEnum } from '../../enums';
import { AmplificadorAplicadoDto, CarrinhoItemDto } from './compras.dtos';

/**
 * DTOs de entrada do domínio de venda (`regras/compras`, m1-20). Complementam a
 * aba Compras com o cálculo de quanto renderia vender itens montados no carrinho
 * (aplicando a taxa da Loja / check-in / fora de patente) e a venda de
 * fragmentos por módulo × tipo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Loja", "Retornando após uma Missão" e
 * "Venda de Fragmentos". O documento vence (proibição #27). As tabelas
 * (`MULTIPLICADOR_TAXA_VENDA`, `VENDA_FRAGMENTOS`) vivem em `venda.dados`.
 */

/**
 * Entrada de `calcularValorVendaCarrinho`: o carrinho (itens + amplificadores) e
 * a taxa de venda aplicada. Reusa o mesmo estado de carrinho do modo Comprar —
 * o valor de venda é a taxa sobre o `gasto` já computado por
 * `calcularTotaisCarrinho`, sem recalcular custo de item.
 */
export interface ValorVendaCarrinhoCalcularDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
  readonly taxa: TaxaVendaEnum;
}

/** Entrada de `obterValorFragmento`: o valor unitário de venda de um fragmento por módulo × tipo. */
export interface ValorFragmentoObterDto {
  readonly modulo: FragmentoModuloEnum;
  readonly tipo: FragmentoTipoEnum;
}

/** Um contador de fragmentos a vender: módulo, tipo e a quantidade. */
export interface ContadorFragmentoDto {
  readonly modulo: FragmentoModuloEnum;
  readonly tipo: FragmentoTipoEnum;
  readonly quantidade: number;
}

/** Entrada de `calcularVendaFragmentos`: os contadores de fragmentos por módulo × tipo. */
export interface VendaFragmentosCalcularDto {
  readonly contadores: readonly ContadorFragmentoDto[];
}
