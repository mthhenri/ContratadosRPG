import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { aplicarLimitesPorClasse, obterLimitesClasse } from './limites';

/**
 * Limites de entrada por classe. `nivelMaximo` (20 agente / 5 civil) e Nível
 * mínimo 0 vêm do documento (sistema-v4.1.0.md — "Progressão" e "Jogando como um
 * Civil" > "Treinamentos"). Os bounds de atributo (−5 a 7; 8 para Experimento
 * Artificial; 3 para Civil) são os clamps de input da calculadora antiga
 * (`aplicarLimitesPorClasse` do script.js), não fórmula do documento.
 */
describe('obterLimitesClasse', () => {
  it('agente padrão: Nível 0–20, atributo −5 a 7', () => {
    expect(obterLimitesClasse({ classe: ClasseEnum.COMBATENTE })).toEqual({
      nivelMinimo: 0,
      nivelMaximo: 20,
      atributoMinimo: -5,
      atributoMaximo: 7,
    });
  });

  it('Experimento Artificial: atributo até 8', () => {
    expect(obterLimitesClasse({ classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL })).toEqual({
      nivelMinimo: 0,
      nivelMaximo: 20,
      atributoMinimo: -5,
      atributoMaximo: 8,
    });
  });

  it('Civil: Nível (treinamentos) 0–5, atributo −5 a 3', () => {
    expect(obterLimitesClasse({ classe: ClasseEnum.CIVIL })).toEqual({
      nivelMinimo: 0,
      nivelMaximo: 5,
      atributoMinimo: -5,
      atributoMaximo: 3,
    });
  });
});

describe('aplicarLimitesPorClasse', () => {
  it('mantém valores já dentro dos limites', () => {
    const entrada = {
      classe: ClasseEnum.COMBATENTE,
      nivel: 10,
      vigor: 3,
      destreza: 2,
      forca: 4,
      vontade: 1,
      sentidos: 0,
    };
    expect(aplicarLimitesPorClasse(entrada)).toEqual({
      nivel: 10,
      vigor: 3,
      destreza: 2,
      forca: 4,
      vontade: 1,
      sentidos: 0,
    });
  });

  it('agente: clampeia Nível a 20 e atributos ao intervalo −5..7', () => {
    expect(
      aplicarLimitesPorClasse({
        classe: ClasseEnum.COMBATENTE,
        nivel: 25,
        vigor: 9,
        destreza: -8,
        forca: 7,
        vontade: 8,
        sentidos: 2,
      }),
    ).toEqual({ nivel: 20, vigor: 7, destreza: -5, forca: 7, vontade: 7, sentidos: 2 });
  });

  it('civil: clampeia Nível a 5 e atributos ao intervalo −5..3', () => {
    expect(
      aplicarLimitesPorClasse({
        classe: ClasseEnum.CIVIL,
        nivel: 9,
        vigor: 5,
        destreza: 3,
        forca: 2,
        vontade: -9,
        sentidos: 1,
      }),
    ).toEqual({ nivel: 5, vigor: 3, destreza: 3, forca: 2, vontade: -5, sentidos: 1 });
  });

  it('Experimento Artificial: atributo pode chegar a 8', () => {
    expect(
      aplicarLimitesPorClasse({
        classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL,
        nivel: 20,
        vigor: 8,
        destreza: 10,
        forca: 0,
        vontade: 0,
        sentidos: 0,
      }),
    ).toEqual({ nivel: 20, vigor: 8, destreza: 8, forca: 0, vontade: 0, sentidos: 0 });
  });
});
