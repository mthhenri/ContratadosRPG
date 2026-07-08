import { calcularTotaisCarrinho } from './compras';
import { MULTIPLICADOR_TAXA_VENDA, VENDA_FRAGMENTOS } from './venda.dados';
import { ValorFragmentoObterDto, ValorVendaCarrinhoCalcularDto, VendaFragmentosCalcularDto } from './venda.dtos';

/**
 * Regras de venda da aba compras (m1-20) — funções puras, zero dependência
 * externa. Não recalculam custo de item nem valor de fragmento: aplicam a taxa
 * sobre o `gasto` já computado por `calcularTotaisCarrinho` (m1-05) e consultam
 * a tabela `VENDA_FRAGMENTOS`. Conferidas contra docs/core/sistema-v4.1.0.md —
 * "Loja", "Retornando após uma Missão" e "Venda de Fragmentos". Em conflito, o
 * documento vence (proibição #27).
 */

/**
 * Valor de venda de um carrinho: a taxa escolhida sobre o `gasto` total do
 * carrinho (itens + modificações + amplificadores) computado pelo motor da
 * m1-05. Arredondado ao inteiro mais próximo.
 */
export function calcularValorVendaCarrinho(dto: ValorVendaCarrinhoCalcularDto): number {
  const gasto = calcularTotaisCarrinho({ itens: dto.itens, amplificadores: dto.amplificadores }).gasto;
  return Math.round(gasto * MULTIPLICADOR_TAXA_VENDA[dto.taxa]);
}

/** Valor unitário de venda de um fragmento por módulo × tipo (lookup na tabela do documento). */
export function obterValorFragmento(dto: ValorFragmentoObterDto): number {
  return VENDA_FRAGMENTOS[dto.modulo][dto.tipo];
}

/**
 * Valor total da venda de fragmentos: soma `quantidade × valor` por módulo ×
 * tipo, consultando a tabela `VENDA_FRAGMENTOS`. Contadores com quantidade ≤ 0
 * não somam. O Módulo ∅ não entra na tabela (negociado com o Mestre).
 */
export function calcularVendaFragmentos(dto: VendaFragmentosCalcularDto): number {
  return dto.contadores.reduce((total, contador) => {
    if (contador.quantidade <= 0) {
      return total;
    }
    return total + contador.quantidade * VENDA_FRAGMENTOS[contador.modulo][contador.tipo];
  }, 0);
}
