import { describe, expect, it } from 'vitest';
import type { AmplificadorAplicadoDto } from '../compras';
import {
  ajusteBloqueioAmplificadores,
  ajusteDanoFurtivoAmplificadores,
  ajusteDefesaAmplificadores,
  ajusteDeslocamentoAmplificadores,
  ajusteEnergiaAmplificadores,
  ajusteEsquivaAmplificadores,
  ajusteInventarioAmplificadores,
  ajusteVidaAmplificadores,
  aplicarReducaoCustoEnergia,
  empilhamentosAmplificador,
  modificadoresTesteAmplificadores,
} from './amplificador';

/**
 * Efeito mecânico dos amplificadores conferido contra docs/core/sistema-v4.1.0.md —
 * "⬡ Amplificadores": bônus principal **escala** com os empilhamentos (`valorPorEmpilhamento ×
 * empilhamentos`, mesma regra das modificações de item — confirmado pelo autor: um amplificador é
 * "muito similar à modificação", e modificação sempre escala mesmo sem a tabela escrever "por
 * empilhamento" por extenso), penalidade cruzada escalando com `empilhamentos - 1` a partir do 2º.
 * `Veloz` é a única exceção onde o próprio ritmo de escala muda depois do 1º empilhamento (doc:
 * "Empilhamentos adicionais aumentam apenas em +1 metro").
 */
function porta(nome: string, empilhamentos: number): AmplificadorAplicadoDto[] {
  return [{ nome, empilhamentos }];
}

describe('empilhamentosAmplificador', () => {
  it('0 quando não portado', () => {
    expect(empilhamentosAmplificador([], 'Defesa')).toBe(0);
  });

  it('devolve os empilhamentos do amplificador pelo nome', () => {
    expect(empilhamentosAmplificador(porta('Defesa', 3), 'Defesa')).toBe(3);
  });
});

describe('ajusteDefesaAmplificadores', () => {
  it('Defesa concede +1 por empilhamento (escala, não é fixo)', () => {
    expect(ajusteDefesaAmplificadores(porta('Defesa', 1))).toBe(1);
    expect(ajusteDefesaAmplificadores(porta('Defesa', 5))).toBe(5);
  });

  it('Resistente penaliza -1 por empilhamento além do 1º', () => {
    expect(ajusteDefesaAmplificadores(porta('Resistente', 1))).toBe(0);
    expect(ajusteDefesaAmplificadores(porta('Resistente', 3))).toBe(-2);
  });

  it('os dois combinam (Defesa 3 stacks = +3, Resistente 3 stacks = -2)', () => {
    const amplificadores = [...porta('Defesa', 3), ...porta('Resistente', 3)];
    expect(ajusteDefesaAmplificadores(amplificadores)).toBe(3 - 2);
  });
});

describe('ajusteEsquivaAmplificadores / ajusteBloqueioAmplificadores', () => {
  it('Reflexos concede +1 de Esquiva por empilhamento', () => {
    expect(ajusteEsquivaAmplificadores(porta('Reflexos', 1))).toBe(1);
    expect(ajusteEsquivaAmplificadores(porta('Reflexos', 5))).toBe(5);
  });

  it('Resiliência concede +1 de Bloqueio por empilhamento', () => {
    expect(ajusteBloqueioAmplificadores(porta('Resiliência', 1))).toBe(1);
    expect(ajusteBloqueioAmplificadores(porta('Resiliência', 4))).toBe(4);
  });
});

describe('modificadoresTesteAmplificadores', () => {
  it('sem amplificadores, mapa vazio', () => {
    expect(modificadoresTesteAmplificadores([])).toEqual({});
  });

  it('Interpessoal: +2 Social/Vontade por empilhamento; do 2º empilhamento, -1 Luta/Pontaria por empilhamento além do 1º', () => {
    expect(modificadoresTesteAmplificadores(porta('Interpessoal', 1))).toEqual({
      social: 2,
      vontade: 2,
    });
    expect(modificadoresTesteAmplificadores(porta('Interpessoal', 3))).toEqual({
      social: 6,
      vontade: 6,
      luta: -2,
      pontaria: -2,
    });
  });

  it('Muscular: +2 Luta/Força por empilhamento; penaliza Intelecto do 2º empilhamento em diante', () => {
    expect(modificadoresTesteAmplificadores(porta('Muscular', 2))).toEqual({
      luta: 4,
      forca: 4,
      intelecto: -1,
    });
  });

  it('dois amplificadores no mesmo atributo somam (ex.: Muscular penaliza Intelecto, Sinapses bonifica Intelecto)', () => {
    const amplificadores = [...porta('Muscular', 2), ...porta('Sinapses', 1)];
    expect(modificadoresTesteAmplificadores(amplificadores)).toEqual({
      luta: 4,
      forca: 4,
      intelecto: -1 + 2,
      sentidos: 2,
    });
  });
});

describe('ajusteDeslocamentoAmplificadores', () => {
  it('Veloz: +3m no 1º empilhamento (empilhamentoInicial é 2, mas testa a fórmula genérica)', () => {
    expect(ajusteDeslocamentoAmplificadores(porta('Veloz', 1))).toBe(3);
  });

  it('Veloz: empilhamentos adicionais somam apenas +1m cada (única exceção com ritmo de escala diferente)', () => {
    expect(ajusteDeslocamentoAmplificadores(porta('Veloz', 2))).toBe(4);
    expect(ajusteDeslocamentoAmplificadores(porta('Veloz', 4))).toBe(6);
  });

  it('Inventário penaliza -1m por empilhamento além do 1º', () => {
    expect(ajusteDeslocamentoAmplificadores(porta('Inventário', 3))).toBe(-2);
  });
});

describe('ajusteInventarioAmplificadores', () => {
  it('Inventário concede +5 por empilhamento (escala, não é fixo)', () => {
    expect(ajusteInventarioAmplificadores(porta('Inventário', 1))).toBe(5);
    expect(ajusteInventarioAmplificadores(porta('Inventário', 4))).toBe(20);
  });

  it('Veloz penaliza -2 por empilhamento além do 1º', () => {
    expect(ajusteInventarioAmplificadores(porta('Veloz', 3))).toBe(-4);
  });
});

describe('ajusteDanoFurtivoAmplificadores', () => {
  it('Letalidade concede 1 marco (+1D6+1) por empilhamento', () => {
    expect(ajusteDanoFurtivoAmplificadores(porta('Letalidade', 1))).toBe(1);
    expect(ajusteDanoFurtivoAmplificadores(porta('Letalidade', 5))).toBe(5);
  });

  it('sem Letalidade, 0 marcos', () => {
    expect(ajusteDanoFurtivoAmplificadores([])).toBe(0);
  });
});

describe('ajusteVidaAmplificadores / ajusteEnergiaAmplificadores', () => {
  it('Vida concede +1/Nível por empilhamento', () => {
    expect(ajusteVidaAmplificadores(porta('Vida', 1), 5)).toBe(5);
    expect(ajusteVidaAmplificadores(porta('Vida', 3), 5)).toBe(15);
  });

  it('Energia penaliza -1/Nível por empilhamento além do 1º', () => {
    expect(ajusteVidaAmplificadores(porta('Energia', 3), 5)).toBe(-10); // -2 * 5
  });

  it('Energia concede +1/Nível por empilhamento; Vida penaliza', () => {
    expect(ajusteEnergiaAmplificadores(porta('Energia', 1), 4)).toBe(4);
    expect(ajusteEnergiaAmplificadores(porta('Energia', 3), 4)).toBe(12);
    expect(ajusteEnergiaAmplificadores(porta('Vida', 3), 4)).toBe(-8); // -2 * 4
  });

  it('Nível 0 não gera ajuste, mesmo portando o amplificador', () => {
    expect(ajusteVidaAmplificadores(porta('Vida', 1), 0)).toBe(0);
  });
});

describe('aplicarReducaoCustoEnergia', () => {
  it('sem Conservador, custo intacto', () => {
    expect(aplicarReducaoCustoEnergia([], 3)).toBe(3);
  });

  it('com Conservador em 1 empilhamento (testa a fórmula genérica), reduz 1, nunca abaixo de 1', () => {
    expect(aplicarReducaoCustoEnergia(porta('Conservador', 1), 3)).toBe(2);
    expect(aplicarReducaoCustoEnergia(porta('Conservador', 2), 1)).toBe(1);
  });

  it('Conservador só existe em 0 ou 2 empilhamentos na prática — com os 2, reduz 2', () => {
    expect(aplicarReducaoCustoEnergia(porta('Conservador', 2), 5)).toBe(3);
  });

  it('custo 0 permanece 0 (habilidade sem custo não vira "mínimo 1")', () => {
    expect(aplicarReducaoCustoEnergia(porta('Conservador', 1), 0)).toBe(0);
  });
});
