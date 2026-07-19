import { describe, expect, it } from 'vitest';
import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
  TipoDanoEnum,
} from '../../enums';
import type { AmplificadorAplicadoDto, CarrinhoItemDto } from '../compras';
import { montarResistencias } from './resistencia';

/**
 * Resistências da aba Combate (m3-36 + ajuste posterior: sempre as 5, manual + equipamento,
 * amplificadores) conferida contra docs/core/sistema-v4.1.0.md — "⬦ Resistências" (exemplo: Colete
 * Kevlar com 3 de Resistência a Dano Balístico) e "⬡ Amplificadores" (Resistente/Defesa).
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

describe('montarResistencias', () => {
  it('devolve sempre as cinco linhas, mesmo sem nenhum equipamento (tudo em 0)', () => {
    const resultado = montarResistencias({ itens: [], amplificadores: [] });
    expect(resultado).toEqual([
      { tipo: TipoDanoEnum.FISICO, manual: 0, equipamento: 0, total: 0 },
      { tipo: TipoDanoEnum.BALISTICO, manual: 0, equipamento: 0, total: 0 },
      { tipo: TipoDanoEnum.EXPLOSAO, manual: 0, equipamento: 0, total: 0 },
      { tipo: TipoDanoEnum.QUIMICO, manual: 0, equipamento: 0, total: 0 },
      { tipo: TipoDanoEnum.GERAL, manual: 0, equipamento: 0, total: 0 },
    ]);
  });

  it('soma a resistência de uma Proteção equipada no total (sem base manual)', () => {
    const item = protecao({ resistencia: '3 [Balístico]' });
    const resultado = montarResistencias({ itens: [item], amplificadores: [] });
    const balistico = resultado.find((linha) => linha.tipo === TipoDanoEnum.BALISTICO)!;
    expect(balistico).toEqual({ tipo: TipoDanoEnum.BALISTICO, manual: 0, equipamento: 3, total: 3 });
  });

  it('ignora itens não equipados', () => {
    const item = protecao({ resistencia: '5 [Físico]', equipado: false });
    const resultado = montarResistencias({ itens: [item], amplificadores: [] });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.total).toBe(0);
  });

  it('soma o bônus de um Fragmento aplicado (m3-35) no equipamento', () => {
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
    const resultado = montarResistencias({ itens: [item], amplificadores: [] });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.total).toBe(20);
  });

  it('a base manual complementa o total, somada ao equipamento', () => {
    const item = protecao({ resistencia: '3 [Balístico]' });
    const resultado = montarResistencias({
      itens: [item],
      amplificadores: [],
      manual: { [TipoDanoEnum.BALISTICO]: 5, [TipoDanoEnum.GERAL]: 2 },
    });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.BALISTICO)).toEqual({
      tipo: TipoDanoEnum.BALISTICO,
      manual: 5,
      equipamento: 3,
      total: 8,
    });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.GERAL)).toEqual({
      tipo: TipoDanoEnum.GERAL,
      manual: 2,
      equipamento: 0,
      total: 2,
    });
  });

  it('o total nunca fica negativo mesmo com base manual negativa', () => {
    const resultado = montarResistencias({
      itens: [],
      amplificadores: [],
      manual: { [TipoDanoEnum.FISICO]: -10 },
    });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.total).toBe(0);
  });

  describe('amplificador Resistente — +1 de resistência a Dano Geral (fixo, não escala)', () => {
    it('1 empilhamento concede +1 Geral', () => {
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Resistente', empilhamentos: 1 }];
      const resultado = montarResistencias({ itens: [], amplificadores });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.GERAL)?.total).toBe(1);
    });

    it('3 empilhamentos continuam concedendo só +1 Geral (bônus fixo, não escala)', () => {
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Resistente', empilhamentos: 3 }];
      const resultado = montarResistencias({ itens: [], amplificadores });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.GERAL)?.total).toBe(1);
    });
  });

  describe('amplificador Defesa — a partir do 2º empilhamento, -1 de resistência a todos os tipos', () => {
    it('1 empilhamento não aplica penalidade', () => {
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Defesa', empilhamentos: 1 }];
      const resultado = montarResistencias({ itens: [], amplificadores });
      expect(resultado.every((l) => l.total === 0)).toBe(true);
    });

    it('3 empilhamentos aplicam -2 (empilhamentos além do 1º) em todos os tipos', () => {
      const item = protecao({ resistencia: '5 [Físico]' });
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Defesa', empilhamentos: 3 }];
      const resultado = montarResistencias({ itens: [item], amplificadores });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.total).toBe(3); // 5 - 2
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.QUIMICO)?.total).toBe(0); // 0 - 2, clampado
    });
  });
});
