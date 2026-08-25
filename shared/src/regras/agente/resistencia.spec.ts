import { describe, expect, it } from 'vitest';
import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  HabilidadeCategoriaEnum,
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
  it('Tanque soma +3 à resistência de cada Proteção equipada, em todos os tipos dela', () => {
    const habilidades = [{
      nome: 'Tanque',
      categoria: HabilidadeCategoriaEnum.ARQUETIPO,
      custoEnergia: 0,
      descricao: '',
    }];
    const resultado = montarResistencias({
      itens: [protecao({ resistencia: '2 [Físico/Balístico]' })],
      amplificadores: [],
      habilidades,
    });
    expect(resultado.find((linha) => linha.tipo === TipoDanoEnum.FISICO)?.equipamento).toBe(5);
    expect(resultado.find((linha) => linha.tipo === TipoDanoEnum.BALISTICO)?.equipamento).toBe(5);
  });

  it('Tanque não bonifica resistência de item que não pertence à categoria Proteções', () => {
    const habilidades = [{
      nome: 'Tanque',
      categoria: HabilidadeCategoriaEnum.ARQUETIPO,
      custoEnergia: 0,
      descricao: '',
    }];
    const item = protecao({ categoria: ItemCategoriaEnum.ARMAZENAMENTO, resistencia: '2 [Físico]' });
    const resultado = montarResistencias({ itens: [item], amplificadores: [], habilidades });
    expect(resultado.find((linha) => linha.tipo === TipoDanoEnum.FISICO)?.equipamento).toBe(2);
  });

  it('devolve sempre as cinco linhas, mesmo sem nenhum equipamento (tudo em 0)', () => {
    const resultado = montarResistencias({ itens: [], amplificadores: [] });
    expect(resultado).toEqual([
      { tipo: TipoDanoEnum.FISICO, manual: 0, equipamento: 0, formacao: 0, total: 0 },
      { tipo: TipoDanoEnum.BALISTICO, manual: 0, equipamento: 0, formacao: 0, total: 0 },
      { tipo: TipoDanoEnum.EXPLOSAO, manual: 0, equipamento: 0, formacao: 0, total: 0 },
      { tipo: TipoDanoEnum.QUIMICO, manual: 0, equipamento: 0, formacao: 0, total: 0 },
      { tipo: TipoDanoEnum.GERAL, manual: 0, equipamento: 0, formacao: 0, total: 0 },
    ]);
  });

  it('Maestria de Vigor soma Vigor à resistência de cada Proteção equipada', () => {
    const resultado = montarResistencias({
      itens: [protecao({ resistencia: '3 [Balístico]' })],
      amplificadores: [],
      maestria: 'vigor',
      vigor: 6,
    });

    expect(resultado.map((linha) => ({ tipo: linha.tipo, total: linha.total }))).toEqual([
      { tipo: TipoDanoEnum.FISICO, total: 0 },
      { tipo: TipoDanoEnum.BALISTICO, total: 9 },
      { tipo: TipoDanoEnum.EXPLOSAO, total: 0 },
      { tipo: TipoDanoEnum.QUIMICO, total: 0 },
      { tipo: TipoDanoEnum.GERAL, total: 0 },
    ]);
  });

  it('Maestria de Vigor não cria resistência sem uma Proteção equipada', () => {
    const resultado = montarResistencias({
      itens: [],
      amplificadores: [],
      maestria: 'vigor',
      vigor: 6,
    });

    expect(resultado.every((linha) => linha.total === 0)).toBe(true);
  });

  it('Maestria de outro atributo não altera as resistências', () => {
    const resultado = montarResistencias({
      itens: [],
      amplificadores: [],
      maestria: 'forca',
      vigor: 6,
    });

    expect(resultado.every((linha) => linha.total === 0)).toBe(true);
  });

  it('soma a resistência de uma Proteção equipada no total (sem base manual)', () => {
    const item = protecao({ resistencia: '3 [Balístico]' });
    const resultado = montarResistencias({ itens: [item], amplificadores: [] });
    const balistico = resultado.find((linha) => linha.tipo === TipoDanoEnum.BALISTICO)!;
    expect(balistico).toEqual({ tipo: TipoDanoEnum.BALISTICO, manual: 0, equipamento: 3, formacao: 0, total: 3 });
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
      formacao: 0,
      total: 8,
    });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.GERAL)).toEqual({
      tipo: TipoDanoEnum.GERAL,
      manual: 2,
      equipamento: 0,
      formacao: 0,
      total: 2,
    });
  });

  it('soma o bônus de Formação da Origem (m3-41: COMBATE_RESISTENCIA_TIPO_DANO) no total', () => {
    const item = protecao({ resistencia: '3 [Balístico]' });
    const resultado = montarResistencias({
      itens: [item],
      amplificadores: [],
      manual: { [TipoDanoEnum.BALISTICO]: 1 },
      formacao: { [TipoDanoEnum.BALISTICO]: 3 },
    });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.BALISTICO)).toEqual({
      tipo: TipoDanoEnum.BALISTICO,
      manual: 1,
      equipamento: 3,
      formacao: 3,
      total: 7,
    });
  });

  it('o total pode negativar com base manual negativa (sem piso)', () => {
    const resultado = montarResistencias({
      itens: [],
      amplificadores: [],
      manual: { [TipoDanoEnum.FISICO]: -10 },
    });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.total).toBe(-10);
  });

  /** Bug de m3-43 (item 28): armazenamento com resistência (Mochila Kevlar, Camadas Extras) não entrava aqui. */
  describe('armazenamento vestido com resistência (m3-43)', () => {
    function armazenamento(parcial: Partial<CarrinhoItemDto>): CarrinhoItemDto {
      return {
        nome: 'Mochila Kevlar',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        ...parcial,
      };
    }

    it('soma a resistência embutida de uma mochila vestida (guardada = false)', () => {
      const resultado = montarResistencias({ itens: [armazenamento({})], amplificadores: [] });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.equipamento).toBe(2);
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.BALISTICO)?.equipamento).toBe(2);
    });

    it('ignora a resistência de uma mochila guardada (guardada = true, não vestida)', () => {
      const resultado = montarResistencias({ itens: [armazenamento({ guardada: true })], amplificadores: [] });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.equipamento).toBe(0);
    });

    it('soma a resistência de "Camadas Extras" mesmo sem resistência embutida no armazenamento', () => {
      const item = armazenamento({
        nome: 'Mochila Mediana',
        modificacoes: [{ nome: 'Camadas Extras', empilhamentos: 1 }],
      });
      const resultado = montarResistencias({ itens: [item], amplificadores: [] });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.equipamento).toBe(1);
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.BALISTICO)?.equipamento).toBe(1);
    });
  });

  it('soma a resistência de um Escudo equipado nos dois tipos da notação composta "[Tipo/Tipo]" (m3-129)', () => {
    const item = protecao({ nome: 'Escudo Leve', resistencia: '1 [Físico/Balístico]' });
    const resultado = montarResistencias({ itens: [item], amplificadores: [] });
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.equipamento).toBe(1);
    expect(resultado.find((l) => l.tipo === TipoDanoEnum.BALISTICO)?.equipamento).toBe(1);
  });

  describe('amplificador Resistente — +1 de resistência a Dano Geral por empilhamento (escala)', () => {
    it('1 empilhamento concede +1 Geral', () => {
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Resistente', empilhamentos: 1 }];
      const resultado = montarResistencias({ itens: [], amplificadores });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.GERAL)?.total).toBe(1);
    });

    it('3 empilhamentos concedem +3 Geral (bônus escala com os empilhamentos, mesma regra das demais modificações)', () => {
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Resistente', empilhamentos: 3 }];
      const resultado = montarResistencias({ itens: [], amplificadores });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.GERAL)?.total).toBe(3);
    });
  });

  describe('amplificador Defesa — a partir do 2º empilhamento, -1 de resistência a todos os tipos', () => {
    it('1 empilhamento não aplica penalidade', () => {
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Defesa', empilhamentos: 1 }];
      const resultado = montarResistencias({ itens: [], amplificadores });
      expect(resultado.every((l) => l.total === 0)).toBe(true);
    });

    it('3 empilhamentos aplicam -2 (empilhamentos além do 1º) em todos os tipos, podendo negativar', () => {
      const item = protecao({ resistencia: '5 [Físico]' });
      const amplificadores: AmplificadorAplicadoDto[] = [{ nome: 'Defesa', empilhamentos: 3 }];
      const resultado = montarResistencias({ itens: [item], amplificadores });
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.FISICO)?.total).toBe(3); // 5 - 2
      expect(resultado.find((l) => l.tipo === TipoDanoEnum.QUIMICO)?.total).toBe(-2); // 0 - 2, sem piso
    });
  });
});
