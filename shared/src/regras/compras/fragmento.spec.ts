import { describe, expect, it } from 'vitest';
import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '../../enums';
import type { CarrinhoItemDto } from './compras.dtos';
import { calcularStatItem } from './compras';
import {
  custoAcoplarFragmento,
  custoAquisicaoFragmento,
  custoRemoverFragmento,
  listarBonusFragmentoPotencializador,
} from './fragmento';

/**
 * Custos de Energia e cardápio de bônus de Fragmentos (m3-32, núcleo: adquirir/acoplar/remover)
 * conferidos contra docs/core/sistema-v4.1.0.md — "⬡ Fragmentos" (exemplo do documento: "acoplar um
 * fragmento de módulo IV em um item custa 7 de Energia + 7 de Energia Máxima, e removê-lo do item
 * custa 14 de Energia").
 */
describe('custoAquisicaoFragmento', () => {
  it('Potencializador custa o valor da tabela por módulo', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.V)).toBe(3);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.IV)).toBe(7);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.III)).toBe(12);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.II)).toBe(16);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, FragmentoModuloEnum.I)).toBe(20);
  });

  it('Construtor custa o dobro do valor da tabela (doc: "seu valor... é dobrado")', () => {
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.CONSTRUTOR, FragmentoModuloEnum.IV)).toBe(14);
    expect(custoAquisicaoFragmento(FragmentoTipoEnum.CONSTRUTOR, FragmentoModuloEnum.I)).toBe(40);
  });
});

describe('custoAcoplarFragmento', () => {
  it('módulo IV custa 7 de Energia + 7 de Energia Máxima (exemplo do documento)', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.IV)).toEqual({ energia: 7, energiaMaxima: 7 });
  });

  it('módulo I custa 20 + 20', () => {
    expect(custoAcoplarFragmento(FragmentoModuloEnum.I)).toEqual({ energia: 20, energiaMaxima: 20 });
  });
});

describe('custoRemoverFragmento', () => {
  it('módulo IV custa 14 de Energia (Energia × 2, exemplo do documento)', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.IV)).toBe(14);
  });

  it('módulo V custa 6', () => {
    expect(custoRemoverFragmento(FragmentoModuloEnum.V)).toBe(6);
  });
});

describe('listarBonusFragmentoPotencializador', () => {
  it('módulo V devolve as 5 opções do cardápio "em um item"', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.V);
    expect(opcoes).toHaveLength(5);
    expect(opcoes.map((opcao) => opcao.efeito.tipo)).toEqual([
      ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      ModificacaoEfeitoTipoEnum.DANO_FIXO,
      ModificacaoEfeitoTipoEnum.RESISTENCIA,
    ]);
    expect(opcoes[0].efeito.valor).toBe(2);
    expect(opcoes[3].efeito.valor).toBe(2);
  });

  it('módulo I tem os maiores valores da tabela (+7 dados, +10 no valor)', () => {
    const opcoes = listarBonusFragmentoPotencializador(FragmentoModuloEnum.I);
    expect(opcoes[0].efeito.valor).toBe(7);
    expect(opcoes[3].efeito.valor).toBe(10);
    expect(opcoes[4].efeito.valor).toBe(10);
  });
});

describe('regressão — calcularStatItem soma mod de origemFragmento igual a mod comum', () => {
  it('RESISTENCIA de um fragmento aplicado soma na resistência do item, como qualquer mod custom', () => {
    const item: CarrinhoItemDto = {
      nome: 'Colete customizado',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      resistencia: '10 [Físico]',
      modificacoes: [
        {
          nome: 'Fragmento Potencializador — Módulo I',
          empilhamentos: 1,
          efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 10 }],
          ignoraLimiteTotal: true,
          ignoraLimiteProprio: true,
          origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.I },
        },
      ],
    };
    expect(calcularStatItem({ item })?.resistencia).toBe('20 [Físico]');
  });

  it('DANO_DADOS_BASE de um fragmento aplicado soma no dado base do dano', () => {
    const item: CarrinhoItemDto = {
      nome: 'Espada customizada',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      dano: '3D4+FOR [Físico]',
      modificacoes: [
        {
          nome: 'Fragmento Potencializador — Módulo V',
          empilhamentos: 1,
          efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: 2 }],
          ignoraLimiteTotal: true,
          ignoraLimiteProprio: true,
          origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
        },
      ],
    };
    expect(calcularStatItem({ item })?.dano).toBe('5D4+FOR [Físico]');
  });
});
