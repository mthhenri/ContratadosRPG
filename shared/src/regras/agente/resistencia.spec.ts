import { describe, expect, it } from 'vitest';
import { FragmentoModuloEnum, FragmentoTipoEnum, ItemCategoriaEnum, ModificacaoEfeitoTipoEnum } from '../../enums';
import type { CarrinhoItemDto } from '../compras';
import { calcularResistencias } from './resistencia';

/**
 * Agregação de resistências da aba Combate (m3-33) conferida contra
 * docs/core/sistema-v4.1.0.md — "⬦ Resistências" (exemplo: Colete Kevlar com 3 de Resistência a
 * Dano Balístico) e "Tipos de Dano" (Dano Geral soma como mais uma entrada).
 */
function protecao(parcial: Partial<CarrinhoItemDto> & { resistencia: string }): CarrinhoItemDto {
  return {
    nome: 'Colete',
    categoria: ItemCategoriaEnum.PROTECOES,
    custo: 0,
    peso: 0,
    quantidade: 1,
    guardada: false,
    modificacoes: [],
    equipado: true,
    ...parcial,
  };
}

describe('calcularResistencias', () => {
  it('soma a resistência de uma única Proteção equipada', () => {
    const item = protecao({ resistencia: '3 [Balístico]' });
    expect(calcularResistencias({ itens: [item] })).toEqual([{ tipo: 'Balístico', valor: 3 }]);
  });

  it('ignora itens não equipados', () => {
    const item = protecao({ resistencia: '5 [Físico]', equipado: false });
    expect(calcularResistencias({ itens: [item] })).toEqual([]);
  });

  it('soma resistências de tipos sobrepostos entre duas Proteções equipadas', () => {
    const a = protecao({ nome: 'Colete', resistencia: '3 [Balístico]' });
    const b = protecao({ nome: 'Placa', resistencia: '5 [Balístico], 2 [Físico]' });
    const resultado = calcularResistencias({ itens: [a, b] });
    expect(resultado).toContainEqual({ tipo: 'Balístico', valor: 8 });
    expect(resultado).toContainEqual({ tipo: 'Físico', valor: 2 });
  });

  it('itens sem resistência computável (armas, itens não equipados) não contribuem', () => {
    const arma: CarrinhoItemDto = {
      nome: 'Faca',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      equipado: true,
      dano: '1D4+FOR [Físico]',
    };
    expect(calcularResistencias({ itens: [arma] })).toEqual([]);
  });

  it('Dano Geral entra como mais uma entrada agregada (doc: "reduz qualquer um" dos tipos)', () => {
    const item = protecao({ resistencia: '7 [Geral]' });
    expect(calcularResistencias({ itens: [item] })).toEqual([{ tipo: 'Geral', valor: 7 }]);
  });

  it('soma o bônus de um Fragmento aplicado (m3-32) junto da resistência base', () => {
    const item = protecao({
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
    });
    expect(calcularResistencias({ itens: [item] })).toEqual([{ tipo: 'Físico', valor: 20 }]);
  });

  it('aceita bônus externos (ponto de extensão pra Formação, ainda não populado por nada)', () => {
    const item = protecao({ resistencia: '3 [Físico]' });
    const resultado = calcularResistencias({
      itens: [item],
      bonusExternos: [{ tipo: 'Físico', valor: 2 }, { tipo: 'Químico', valor: 1 }],
    });
    expect(resultado).toContainEqual({ tipo: 'Físico', valor: 5 });
    expect(resultado).toContainEqual({ tipo: 'Químico', valor: 1 });
  });

  it('inventário vazio ou sem Proteções equipadas devolve lista vazia', () => {
    expect(calcularResistencias({ itens: [] })).toEqual([]);
  });
});
