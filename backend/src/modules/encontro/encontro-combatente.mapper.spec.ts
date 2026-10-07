import { describe, expect, it } from 'vitest';
import type { EncontroCombatenteLinhaDto } from '@contratados-rpg/shared/dtos/encontro';
import {
    CadenciaEnum, ClasseEnum, ItemCategoriaEnum, ModificacaoEfeitoTipoEnum, TipoDanoEnum,
    TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { montarCombatenteResumo } from './encontro-combatente.mapper';

describe('montarCombatenteResumo — stats efetivos de agente', () => {
    it("preserva snapshots, Energia e Morrendo do NPC legado sem equipamento", () => {
        const linha = {
            id: 1, encontroId: 2, fichaId: 3, tipoFicha: TipoFichaEnum.NPC,
            fichaDados: {
                vidaAtual: 10, vidaMaxima: 999, energia: { atual: 12, maxima: 99 },
                defesaBase: 15, esquivar: 17, bloquear: 18, atributos: { destreza: 2 },
                condicoes: { morrendo: true },
            },
        } as unknown as EncontroCombatenteLinhaDto;
        expect(montarCombatenteResumo(linha)).toMatchObject({
            vidaAtual: 10, vidaMaxima: 999, energiaAtual: 12, energiaMaxima: 99,
            defesa: 15, esquiva: 17, bloqueio: 18, morrendo: true,
            machucado: null, inconsciente: null, contraAtaque: null, resistencias: null,
        });
    });
    it("NPC soma equipamento à defesa manual e resolve resistências no encontro (m4-20)", () => {
        // Sistema v4.1.3, Proteções e Escudos; Guia v4.2.0, Equipamento do NPC.
        const dados = {
            vidaAtual: 10, vidaMaxima: 999, energia: { atual: 12, maxima: 99 },
            defesaBase: 45, esquivar: 47, bloquear: 48, atributos: { destreza: 2 },
            inventario: [{
                nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES,
                custo: 0, peso: 0, quantidade: 1, guardada: false, equipado: true,
                modificacoes: [{
                    nome: "Defensiva", empilhamentos: 1,
                    efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.DEFESA,
                        variante: "Defesa", valor: 2 }],
                }, { nome: "Resistente", empilhamentos: 3 }],
            }, {
                nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES,
                custo: 0, peso: 0, quantidade: 1, guardada: false, equipado: false,
                modificacoes: [{ nome: "Flexível", empilhamentos: 2 }],
            }],
        };
        const linha = {
            id: 1, encontroId: 2, fichaId: 3, tipoFicha: TipoFichaEnum.NPC, fichaDados: dados,
        } as unknown as EncontroCombatenteLinhaDto;
        expect(montarCombatenteResumo(linha)).toMatchObject({
            vidaAtual: 10, vidaMaxima: 999, energiaAtual: 12, energiaMaxima: 99,
            defesa: 47, esquiva: 47, bloqueio: 50, contraAtaque: null,
            resistencias: {
                [TipoDanoEnum.FISICO]: 5, [TipoDanoEnum.BALISTICO]: 3,
                [TipoDanoEnum.EXPLOSAO]: 0, [TipoDanoEnum.QUIMICO]: 0, [TipoDanoEnum.GERAL]: 0,
            },
        });
        expect(dados).toMatchObject({ defesaBase: 45, esquivar: 47, bloquear: 48 });
    });
  it('aplica amplificadores e proteção equipada sobre os snapshots da ficha', () => {
    const linha = {
      id: 1, encontroId: 2, fichaId: 3, tipoFicha: TipoFichaEnum.JOGADOR,
      fichaNome: 'Kane', fichaCor: null, fichaImagemUrl: null, fichaImagemFoco: null, fichaDonoNome: 'Dono',
      iniciativa: null, cadencia: CadenciaEnum.SINGULAR, ordem: 1, condicoes: [], iniciativaFormulaCustom: null,
      fichaDados: {
        classe: ClasseEnum.COMBATENTE, arquetipo: null, nivel: 3,
        atributos: { luta: 4, vigor: 3, destreza: 2 }, habilidades: [],
        estado: { vidaAtual: 10, energiaAtual: 5, vidaMaxima: 100, energiaMaxima: 50 },
        derivados: { defesa: 20, esquiva: 25, bloqueio: 26, contraAtaque: 24 },
        inventario: {
          itens: [{ nome: 'Colete de Kevlar', categoria: 'PROTECOES', custo: 0, peso: 0, quantidade: 1, guardada: false, equipado: true, modificacoes: [{ nome: 'Flexível', empilhamentos: 2 }, { nome: 'Resistente', empilhamentos: 3 }] }],
          amplificadores: [{ nome: 'Vida', empilhamentos: 2 }, { nome: 'Energia', empilhamentos: 2 }, { nome: 'Defesa', empilhamentos: 1 }, { nome: 'Reflexos', empilhamentos: 1 }, { nome: 'Resiliência', empilhamentos: 1 }],
        },
      },
    } as unknown as EncontroCombatenteLinhaDto;

    expect(montarCombatenteResumo(linha)).toMatchObject({
      vidaMaxima: 103, energiaMaxima: 53, defesa: 21, esquiva: 28, bloqueio: 30, contraAtaque: 25,
    });
  });
});
