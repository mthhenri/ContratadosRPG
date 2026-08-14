import { describe, expect, it } from 'vitest';
import { sugerirDeslocamentoTerrestre } from './deslocamento';

describe('sugerirDeslocamentoTerrestre', () => {
  it('Destreza 0 ou menos: 4–6m', () => {
    expect(sugerirDeslocamentoTerrestre({ destreza: 0 })).toEqual({ minimo: 4, maximo: 6 });
    expect(sugerirDeslocamentoTerrestre({ destreza: -3 })).toEqual({ minimo: 4, maximo: 6 });
  });

  it('Destreza 3–4 ("A Estátua" tem Destreza 4): 10–12m', () => {
    expect(sugerirDeslocamentoTerrestre({ destreza: 4 })).toEqual({ minimo: 10, maximo: 12 });
  });

  it('Destreza 9–10: 21–25m', () => {
    expect(sugerirDeslocamentoTerrestre({ destreza: 10 })).toEqual({ minimo: 21, maximo: 25 });
  });

  it('acima de 10 usa a última faixa como referência (fora da tabela — é sugestão, nunca trava)', () => {
    expect(sugerirDeslocamentoTerrestre({ destreza: 15 })).toEqual({ minimo: 21, maximo: 25 });
  });
});
