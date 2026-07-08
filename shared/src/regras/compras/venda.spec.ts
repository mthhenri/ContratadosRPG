import { describe, expect, it } from 'vitest';
import { FragmentoModuloEnum, FragmentoTipoEnum, ItemCategoriaEnum, TaxaVendaEnum } from '../../enums';
import { CarrinhoItemDto } from './compras.dtos';
import { calcularTotaisCarrinho } from './compras';
import { CUSTO_PRIMEIRO_AMPLIFICADOR } from './compras.dados';
import { MULTIPLICADOR_TAXA_VENDA, VENDA_FRAGMENTOS } from './venda.dados';
import { calcularValorVendaCarrinho, calcularVendaFragmentos, obterValorFragmento } from './venda';

/**
 * Regras de venda (m1-20) conferidas contra docs/core/sistema-v4.1.0.md — "Loja"
 * (venda por metade), "Retornando após uma Missão" (check-in 75% / fora de
 * patente 25%) e "Venda de Fragmentos" (tabela por módulo × tipo). Em conflito,
 * o documento vence (proibição #27).
 */

/** Monta um item de carrinho preenchendo os campos não informados com padrões neutros. */
function montarItem(parcial: Partial<CarrinhoItemDto> & Pick<CarrinhoItemDto, 'nome' | 'categoria'>): CarrinhoItemDto {
  return {
    custo: 0,
    peso: 0,
    quantidade: 1,
    guardada: false,
    modificacoes: [],
    ...parcial,
  };
}

describe('MULTIPLICADOR_TAXA_VENDA', () => {
  it('reproduz as três taxas do documento', () => {
    // Loja = metade; check-in de retorno = 75%; fora de patente não entregue = 25%.
    expect(MULTIPLICADOR_TAXA_VENDA[TaxaVendaEnum.NORMAL]).toBe(0.5);
    expect(MULTIPLICADOR_TAXA_VENDA[TaxaVendaEnum.CHECKIN]).toBe(0.75);
    expect(MULTIPLICADOR_TAXA_VENDA[TaxaVendaEnum.FORA_PATENTE]).toBe(0.25);
  });
});

describe('calcularValorVendaCarrinho', () => {
  it('aplica cada taxa sobre o gasto do carrinho', () => {
    const itens = [montarItem({ nome: 'Item', categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 1000 })];
    expect(calcularTotaisCarrinho({ itens, amplificadores: [] }).gasto).toBe(1000);

    expect(calcularValorVendaCarrinho({ itens, amplificadores: [], taxa: TaxaVendaEnum.NORMAL })).toBe(500);
    expect(calcularValorVendaCarrinho({ itens, amplificadores: [], taxa: TaxaVendaEnum.CHECKIN })).toBe(750);
    expect(calcularValorVendaCarrinho({ itens, amplificadores: [], taxa: TaxaVendaEnum.FORA_PATENTE })).toBe(250);
  });

  it('não recalcula custo — reusa o gasto do motor, incluindo amplificadores', () => {
    const itens = [montarItem({ nome: 'Item', categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 1000, quantidade: 2 })];
    const amplificadores = [{ nome: 'Amp', empilhamentos: 1 }];
    // gasto = 1000×2 + 3000 (1º empilhamento de amplificador) = 5000
    const gasto = calcularTotaisCarrinho({ itens, amplificadores }).gasto;
    expect(gasto).toBe(2000 + CUSTO_PRIMEIRO_AMPLIFICADOR);
    expect(calcularValorVendaCarrinho({ itens, amplificadores, taxa: TaxaVendaEnum.NORMAL })).toBe(gasto / 2);
  });

  it('arredonda ao inteiro mais próximo', () => {
    const itens = [montarItem({ nome: 'Item', categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 1001 })];
    // 1001 × 0,75 = 750,75 → 751 ; 1001 × 0,25 = 250,25 → 250
    expect(calcularValorVendaCarrinho({ itens, amplificadores: [], taxa: TaxaVendaEnum.CHECKIN })).toBe(751);
    expect(calcularValorVendaCarrinho({ itens, amplificadores: [], taxa: TaxaVendaEnum.FORA_PATENTE })).toBe(250);
  });

  it('carrinho vazio rende zero em qualquer taxa', () => {
    expect(calcularValorVendaCarrinho({ itens: [], amplificadores: [], taxa: TaxaVendaEnum.CHECKIN })).toBe(0);
  });
});

describe('VENDA_FRAGMENTOS / obterValorFragmento', () => {
  it('confere cada célula da tabela do documento', () => {
    const esperado: ReadonlyArray<[FragmentoModuloEnum, number, number]> = [
      [FragmentoModuloEnum.V, 500, 750],
      [FragmentoModuloEnum.IV, 1100, 1600],
      [FragmentoModuloEnum.III, 2300, 3300],
      [FragmentoModuloEnum.II, 4700, 6700],
      [FragmentoModuloEnum.I, 10000, 15000],
    ];
    esperado.forEach(([modulo, potencializador, construtor]) => {
      expect(obterValorFragmento({ modulo, tipo: FragmentoTipoEnum.POTENCIALIZADOR })).toBe(potencializador);
      expect(obterValorFragmento({ modulo, tipo: FragmentoTipoEnum.CONSTRUTOR })).toBe(construtor);
      expect(VENDA_FRAGMENTOS[modulo][FragmentoTipoEnum.POTENCIALIZADOR]).toBe(potencializador);
      expect(VENDA_FRAGMENTOS[modulo][FragmentoTipoEnum.CONSTRUTOR]).toBe(construtor);
    });
  });
});

describe('calcularVendaFragmentos', () => {
  it('soma quantidade × valor por módulo × tipo', () => {
    const total = calcularVendaFragmentos({
      contadores: [
        { modulo: FragmentoModuloEnum.I, tipo: FragmentoTipoEnum.CONSTRUTOR, quantidade: 2 }, // 2 × 15000 = 30000
        { modulo: FragmentoModuloEnum.V, tipo: FragmentoTipoEnum.POTENCIALIZADOR, quantidade: 3 }, // 3 × 500 = 1500
      ],
    });
    expect(total).toBe(31500);
  });

  it('ignora contadores com quantidade zero ou negativa', () => {
    expect(
      calcularVendaFragmentos({
        contadores: [
          { modulo: FragmentoModuloEnum.II, tipo: FragmentoTipoEnum.POTENCIALIZADOR, quantidade: 0 },
          { modulo: FragmentoModuloEnum.III, tipo: FragmentoTipoEnum.CONSTRUTOR, quantidade: -1 },
        ],
      }),
    ).toBe(0);
  });

  it('lista de contadores vazia rende zero', () => {
    expect(calcularVendaFragmentos({ contadores: [] })).toBe(0);
  });
});

describe('total combinado (itens na taxa + fragmentos)', () => {
  it('soma o valor de venda dos itens e o dos fragmentos', () => {
    const itens = [montarItem({ nome: 'Item', categoria: ItemCategoriaEnum.CORPO_A_CORPO, custo: 2000 })];
    const valorItens = calcularValorVendaCarrinho({ itens, amplificadores: [], taxa: TaxaVendaEnum.NORMAL }); // 1000
    const valorFragmentos = calcularVendaFragmentos({
      contadores: [{ modulo: FragmentoModuloEnum.IV, tipo: FragmentoTipoEnum.CONSTRUTOR, quantidade: 1 }], // 1600
    });
    expect(valorItens).toBe(1000);
    expect(valorFragmentos).toBe(1600);
    expect(valorItens + valorFragmentos).toBe(2600);
  });
});
