import { describe, expect, it } from 'vitest';
import type { EncontroCombatenteLinhaDto } from '@contratados-rpg/shared/dtos/encontro';
import { CadenciaEnum, ClasseEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { montarCombatenteResumo } from './encontro-combatente.mapper';

describe('montarCombatenteResumo — stats efetivos de agente', () => {
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
