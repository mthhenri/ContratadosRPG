import { describe, expect, it } from 'vitest';

import { ClasseEnum, HabilidadeCategoriaEnum, ItemCategoriaEnum } from '../../enums';
import type { FichaAtributosDto, FichaHabilidadeDto } from '../../dtos/ficha';
import { calcularDerivados } from './derivados';
import { calcularContraAtaque, calcularDefesa } from './defesa';
import { calcularInventario } from './inventario';
import { calcularStatsEfetivos } from './stats-efetivos';

const atributos: FichaAtributosDto = {
  destreza: 2,
  forca: 3,
  luta: 2,
  pontaria: 1,
  vigor: 4,
  intelecto: 1,
  medicina: 1,
  sentidos: 2,
  social: 1,
  vontade: 2,
};

/**
 * Prova o snapshot de derivados (m3-10): reusa as fórmulas de `agente` (fonte única) e devolve o
 * bloco persistível; stats que a classe não possui saem `undefined`.
 */
describe('calcularDerivados', () => {
  it('bate com as fórmulas individuais de shared/regras (sem recalcular diferente)', () => {
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos);
    const defesa = calcularDefesa({ classe: ClasseEnum.COMBATENTE, nivel: 3, destreza: 2, vigor: 4 });
    expect(derivados.defesa).toBe(defesa?.defesa);
    expect(derivados.esquiva).toBe(defesa?.esquiva);
    expect(derivados.bloqueio).toBe(defesa?.bloqueio);
    expect(derivados.inventarioMaximo).toBe(
      calcularInventario({ classe: ClasseEnum.COMBATENTE, forca: 3 }),
    );
    expect(typeof derivados.deslocamento).toBe('number');
    expect(typeof derivados.percepcao).toBe('number');
    expect(typeof derivados.habilidadesPorTurno).toBe('number');
  });

  it('Civil não tem defesa/proficiência/dano furtivo → undefined', () => {
    const derivados = calcularDerivados(ClasseEnum.CIVIL, 0, atributos);
    expect(derivados.defesa).toBeUndefined();
    expect(derivados.esquiva).toBeUndefined();
    expect(derivados.proficiencia).toBeUndefined();
    expect(derivados.danoFurtivo).toBeUndefined();
    // Deslocamento/percepção/inventário existem para qualquer classe.
    expect(typeof derivados.deslocamento).toBe('number');
  });
});

describe('calcularDerivados — contraAtaque', () => {
  it('sem habilidades (padrão) → contraAtaque undefined', () => {
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos);
    expect(derivados.contraAtaque).toBeUndefined();
  });

  it('com a habilidade "Contra-Ataque" → mesma fórmula de calcularContraAtaque', () => {
    const habilidades: FichaHabilidadeDto[] = [
      {
        nome: 'Contra-Ataque',
        categoria: HabilidadeCategoriaEnum.GERAL,
        custoEnergia: 2,
        descricao: '(Reação)…',
      },
    ];
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos, habilidades);
    const defesa = calcularDefesa({ classe: ClasseEnum.COMBATENTE, nivel: 3, destreza: 2, vigor: 4 });
    expect(derivados.contraAtaque).toBe(
      calcularContraAtaque({
        luta: atributos.luta,
        vigor: atributos.vigor,
        defesa: defesa?.defesa ?? null,
        habilidades,
      }),
    );
  });
});

describe('calcularDerivados — inventário com "Mochileiro"', () => {
  it('sem a habilidade → inventário segue Força (comportamento atual)', () => {
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos);
    expect(derivados.inventarioMaximo).toBe(
      calcularInventario({ classe: ClasseEnum.COMBATENTE, forca: atributos.forca }),
    );
  });

  it('com "Mochileiro" → troca Força por (Intelecto − 1) no inventário', () => {
    const habilidades: FichaHabilidadeDto[] = [
      {
        nome: 'Mochileiro',
        categoria: HabilidadeCategoriaEnum.GERAL,
        custoEnergia: 0,
        descricao: 'Muda o atributo de cálculo do inventário de Força para Intelecto - 1.',
      },
    ];
    const derivados = calcularDerivados(ClasseEnum.COMBATENTE, 3, atributos, habilidades);
    expect(derivados.inventarioMaximo).toBe(
      calcularInventario({
        classe: ClasseEnum.COMBATENTE,
        forca: atributos.forca,
        intelecto: atributos.intelecto,
        habilidades,
      }),
    );
    expect(derivados.inventarioMaximo).not.toBe(atributos.forca * 5);
  });
});

describe('calcularStatsEfetivos', () => {
  it('soma amplificadores e proteção equipada sobre os snapshots stored, incluindo a cascata de Defesa', () => {
    const stats = calcularStatsEfetivos({
      classe: ClasseEnum.COMBATENTE,
      nivel: 3,
      atributos,
      habilidades: [],
      derivados: { defesa: 20, esquiva: 25, bloqueio: 26, contraAtaque: 24 },
      estado: { vidaMaxima: 100, energiaMaxima: 50 },
      amplificadores: [
        { nome: 'Vida', empilhamentos: 2 },
        { nome: 'Energia', empilhamentos: 2 },
        { nome: 'Defesa', empilhamentos: 1 },
        { nome: 'Reflexos', empilhamentos: 1 },
        { nome: 'Resiliência', empilhamentos: 1 },
      ],
      itens: [
        {
          uid: 'colete',
          nome: 'Colete de Kevlar',
          categoria: ItemCategoriaEnum.PROTECOES,
          custo: 100,
          peso: 1,
          quantidade: 1,
          guardada: false,
          equipado: true,
          modificacoes: [
            { nome: 'Flexível', empilhamentos: 2 },
            { nome: 'Resistente', empilhamentos: 3 },
          ],
        },
      ],
    });

    expect(stats).toEqual({
      vidaMaxima: 103,
      energiaMaxima: 53,
      defesa: 21,
      esquiva: 28,
      bloqueio: 30,
      contraAtaque: 25,
    });
  });

  it('preserva a ausência de reações para Civil', () => {
    expect(
      calcularStatsEfetivos({
        classe: ClasseEnum.CIVIL,
        nivel: 0,
        atributos,
        habilidades: [],
        derivados: {},
        estado: {},
      }),
    ).toMatchObject({ defesa: null, esquiva: null, bloqueio: null, contraAtaque: null });
  });
});
