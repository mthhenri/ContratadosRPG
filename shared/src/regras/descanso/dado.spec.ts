import { describe, expect, it } from 'vitest';
import { ajustarDado, descreverDado, elevarDado } from './dado';
import { ESCADA_DADOS } from './descanso.dados';

/**
 * Escada de dados e seus utilitários, conferidos contra
 * docs/core/sistema-v4.1.0.md — "Descanso" (o único degrau concreto que o
 * documento fixa é D4 → D3 para ambiente insalubre) e por paridade com
 * `tipoDado`/`_upgradeDie`/`descDado` de `contratados-calculadora/src/script.js`.
 */
describe('ESCADA_DADOS', () => {
  it('está em ordem crescente de faces, começando em D3', () => {
    expect(ESCADA_DADOS).toEqual([3, 4, 6, 8, 10, 12, 20]);
  });
});

describe('ajustarDado', () => {
  it('reduz 1 tipo com modificador negativo (Insalubre): D4 → D3 (exemplo do documento)', () => {
    expect(ajustarDado({ dadoBase: 4, modificador: -1 })).toBe(3);
  });

  it('mantém o dado com modificador zero (Adequado)', () => {
    expect(ajustarDado({ dadoBase: 6, modificador: 0 })).toBe(6);
  });

  it('aumenta 1 tipo com modificador positivo (Confortável): D4 → D6', () => {
    expect(ajustarDado({ dadoBase: 4, modificador: 1 })).toBe(6);
  });

  it('acumula qualidade + refeição (Longo confortável com refeição): D8 +2 → D12', () => {
    expect(ajustarDado({ dadoBase: 8, modificador: 2 })).toBe(12);
  });

  it('trava no menor dado da escada (não desce abaixo de D3)', () => {
    expect(ajustarDado({ dadoBase: 3, modificador: -3 })).toBe(3);
    expect(ajustarDado({ dadoBase: 4, modificador: -5 })).toBe(3);
  });

  it('trava no maior dado da escada (não sobe acima de D20)', () => {
    expect(ajustarDado({ dadoBase: 20, modificador: 5 })).toBe(20);
    expect(ajustarDado({ dadoBase: 12, modificador: 9 })).toBe(20);
  });
});

describe('elevarDado', () => {
  it('sobe o número de degraus pedido na escada', () => {
    expect(elevarDado({ faces: 6, passos: 1 })).toBe(8);
    expect(elevarDado({ faces: 4, passos: 2 })).toBe(8);
  });

  it('não ultrapassa o limite informado', () => {
    expect(elevarDado({ faces: 8, passos: 1, limite: 10 })).toBe(10);
    expect(elevarDado({ faces: 8, passos: 3, limite: 10 })).toBe(10);
  });

  it('sem limite, trava no topo da escada (D20)', () => {
    expect(elevarDado({ faces: 12, passos: 5 })).toBe(20);
  });

  it('com 0 passos, mantém o dado', () => {
    expect(elevarDado({ faces: 6, passos: 0 })).toBe(6);
  });

  it('devolve faces inalterado quando o dado não está na escada', () => {
    expect(elevarDado({ faces: 5, passos: 2 })).toBe(5);
  });
});

describe('descreverDado', () => {
  it('descreve um dado como "D<faces>"', () => {
    expect(descreverDado({ faces: 8 })).toBe('D8');
    expect(descreverDado({ faces: 3 })).toBe('D3');
  });

  it('descreve ausência de dado como "—" (null ou 0)', () => {
    expect(descreverDado({ faces: null })).toBe('—');
    expect(descreverDado({ faces: 0 })).toBe('—');
  });
});
