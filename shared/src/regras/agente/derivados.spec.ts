import { describe, expect, it } from 'vitest';

import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import type { FichaAtributosDto, FichaHabilidadeDto } from '../../dtos/ficha';
import { calcularDerivados } from './derivados';
import { calcularContraAtaque, calcularDefesa } from './defesa';
import { calcularInventario } from './inventario';

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
      calcularInventario({ classe: ClasseEnum.COMBATENTE, nivel: 3, forca: 3 }),
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
