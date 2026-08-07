import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { calcularOrcamentoAtributos, validarDistribuicaoAtributos } from './criacao';

const base = (valor = 1): FichaAtributosDto => ({
  destreza: valor, forca: valor, luta: valor, pontaria: valor, vigor: valor,
  intelecto: valor, medicina: valor, sentidos: valor, social: valor, vontade: valor,
});

describe('orçamento de atributos da criação', () => {
  it('oferece 4 pontos no nível zero e usa o teto da classe', () => {
    expect(calcularOrcamentoAtributos({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toEqual({
      pontosCriacao: 4, pontosNivel: 0, pontosTotais: 4,
      maximoNaCriacao: 3, maximoDemaisNaCriacao: 2, maximoFinal: 7,
    });
  });

  it('não cobra os dez pontos base e permite transferir um deles ao zerar', () => {
    const atributos = { ...base(), destreza: 0, forca: 3, luta: 2, vigor: 2, vontade: 2 };
    expect(validarDistribuicaoAtributos({ classe: ClasseEnum.COMBATENTE, nivel: 0, atributos }))
      .toEqual({ gastos: 4, saldo: 0, violacoes: [] });
  });

  it('não permite concentrar mais de 2 pontos de criação em um atributo', () => {
    const atributos = { ...base(), destreza: 5 };

    expect(validarDistribuicaoAtributos({ classe: ClasseEnum.COMBATENTE, nivel: 0, atributos }).violacoes)
      .toContain('destreza: valor acima do máximo na criação');
  });

  it('sinaliza saldo excedido, piso e mais de um atributo acima de 2', () => {
    const atributos = { ...base(), destreza: -1, forca: 4, luta: 4, vigor: 4 };
    const resultado = validarDistribuicaoAtributos({ classe: ClasseEnum.COMBATENTE, nivel: 0, atributos });
    expect(resultado.saldo).toBeLessThan(0);
    expect(resultado.violacoes).toContain('destreza: valor abaixo de 0');
    expect(resultado.violacoes).toContain('apenas um atributo pode ultrapassar 2 na criação');
    expect(resultado.violacoes).toContain('total de pontos excedido');
  });

  it.each([
    [1, { destreza: 3, forca: 3, luta: 2 }],
    [5, { destreza: 7, forca: 3, luta: 2, pontaria: 2, vigor: 2 }],
    [10, { destreza: 7, forca: 7, luta: 3, pontaria: 2, vigor: 2, intelecto: 2, medicina: 2, sentidos: 2 }],
    [15, { destreza: 7, forca: 7, luta: 7, pontaria: 7, vigor: 3 }],
    [20, { destreza: 7, forca: 7, luta: 7, pontaria: 7, vigor: 7, intelecto: 3, medicina: 2, sentidos: 2 }],
  ] satisfies readonly [number, Partial<FichaAtributosDto>][])('aceita a distribuição convencional completa no nível %i', (nivel, alteracoes) => {
    const resultado = validarDistribuicaoAtributos({
      classe: ClasseEnum.COMBATENTE,
      nivel,
      atributos: { ...base(), ...alteracoes },
    });

    expect(resultado.saldo).toBe(0);
    expect(resultado.violacoes).toEqual([]);
  });

  it('rejeita uma distribuição de progressão que não pode partir de uma criação válida', () => {
    const atributos = { ...base(0), destreza: 7, forca: 7, luta: 1 };

    expect(validarDistribuicaoAtributos({ classe: ClasseEnum.COMBATENTE, nivel: 1, atributos }).violacoes)
      .toContain('distribuição final não contém os 4 pontos de criação em uma forma válida');
  });
});
