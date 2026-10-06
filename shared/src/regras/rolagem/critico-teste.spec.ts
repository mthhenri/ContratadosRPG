import { describe, expect, it } from 'vitest';
import type { FichaAtributosDto } from '../../dtos/ficha';
import { rolarFormula, rolarPasso, resolverPreset } from './rolagem';

// Sistema v4.1.3, “Crítico e Margem de Crítico” (1227–1233) e “Cura” (1316).
const atributos: FichaAtributosDto = {
  luta: 3, pontaria: 3, forca: 6, destreza: 2, vigor: 2,
  medicina: 3, intelecto: 2, vontade: 2, sentidos: 2, social: 2,
};
const sequencia = (valores: readonly number[]) => {
  let indice = 0;
  return () => {
    if (indice >= valores.length) throw new Error('Pool rolou mais dados que o previsto');
    return valores[indice++];
  };
};

describe('crítico de teste — Sistema v4.1.3', () => {
  it('soma +2 uma única vez, mesmo com dois críticos no pool do ataque', () => {
    const resultado = rolarFormula(
      { formula: 'LUTd20kh1cm1+PROF', atributos, proficiencia: 9 }, sequencia([20, 20, 9]),
    )!;
    expect(resultado.total).toBe(31);
    expect(resultado.dados[0].mantidos).toEqual([20]);
    expect(resultado.dados[0].criticos).toBe(1);
    expect(resultado.atributos).toEqual([{ rotulo: 'PROF', valor: 9 }, { rotulo: 'CRÍTICO', valor: 2 }]);
    expect(resultado.critico).toBeUndefined(); // Não é comando para dobrar o resultado.
  });

  it('aplica a margem natural sem exigir cm e sem dobrar o modificador', () => {
    const resultado = rolarFormula(
      { formula: 'INTd20kh1+3', atributos }, sequencia([20, 8]),
    )!;
    expect(resultado.total).toBe(25);
    expect(resultado.constante).toBe(3);
    expect(resultado.dados[0].criticos).toBe(1);
  });

  it('respeita margem ampliada e não concede bônus fora da margem', () => {
    const ampliada = rolarFormula({ formula: 'PONd20kh1cm2+PROF', atributos, proficiencia: 9 }, sequencia([19, 9, 8]))!;
    const natural = rolarFormula({ formula: 'PONd20kh1+PROF', atributos, proficiencia: 9 }, sequencia([19, 9, 8]))!;
    expect(ampliada.total).toBe(30);
    expect(natural.total).toBe(28);
    expect(natural.atributos).toEqual([{ rotulo: 'PROF', valor: 9 }]);
  });

  it('desvantagem ignora crítico descartado, mas concede +2 se o menor é crítico', () => {
    const entrada = { formula: 'LUTd20kh1+PROF', atributos: { ...atributos, luta: 0 }, proficiencia: 9 };
    expect(rolarFormula(entrada, sequencia([20, 3]))?.total).toBe(12);
    expect(rolarFormula(entrada, sequencia([20, 20]))?.total).toBe(31);
    expect(rolarFormula({ ...entrada, formula: '2d20kl1+PROF' }, sequencia([20, 3]))?.total).toBe(12);
  });

  it('cada repetição calcula seu próprio crítico', () => {
    const resultado = rolarFormula(
      { formula: '(LUTd20kh1+PROF)#3', atributos, proficiencia: 9 }, sequencia([20, 20, 9, 19, 9, 8, 20, 8, 7]),
    )!;
    expect(resultado.subResultados?.map((item) => item.total)).toEqual([31, 28, 31]);
    expect(resultado.total).toBe(31);
  });

  it('o runner de preset aplica o mesmo bônus em teste sem dobrar dados ou fixos', () => {
    const plano = resolverPreset({ preset: { nome: 'Ataque', formula: 'LUTd20kh1+FOR+PROF+3', critico: true }, atributos });
    const resultado = rolarPasso(plano.passos[0], atributos, 9, undefined, sequencia([18, 9, 8]), true)!;
    expect(resultado.total).toBe(38); // 18 + FOR 6 + PROF 9 + 3 + crítico 2.
    expect(resultado.dados[0].valores).toHaveLength(3);
    expect(resultado.constante).toBe(3);
    expect(resultado.critico).toBeUndefined();
  });

  it.each([
    ['3d20cm1', [20, 20, 9], 49],
    ['2d6kh1cm1', [6, 6], 6],
    ['2d20kh1cm1 [Físico]', [20, 20], 20],
    ['2d20kh1cm1+FOR [Físico]', [20, 20], 26],
    ['2d20kh1cm1+2 [Físico]', [20, 20], 22],
    ['2d20kh1cm1+(FOR+VIG) [Físico]', [20, 20], 28],
    ['2d20kh2cm1', [20, 20], 40],
    ['-2d20kh1cm1', [20, 20], -20],
    ['2d20kh1cm1+1d4', [20, 20, 4], 24],
  ] as const)('pool genérico %s não recebe bônus de teste por possuir cm/keep', (formula, valores, total) => {
    expect(rolarFormula({ formula, atributos }, sequencia(valores))?.total).toBe(total);
  });

  it('cura crítica dobra 2d4 e atributos/fixos, preservando Patente/Nível', () => {
    const bandagem = rolarFormula({ formula: '2d4', atributos, critico: true }, sequencia([4, 3, 2, 1]))!;
    expect(bandagem.dados[0].valores).toHaveLength(4);
    expect(bandagem.total).toBe(10);
    expect(bandagem.atributos).toEqual([]);
    const cura = rolarFormula(
      { formula: '2d4+MED+PROF+NIV+3', atributos, proficiencia: 2, nivel: 2, critico: true }, sequencia([4, 4, 4, 4]),
    )!;
    expect(cura.total).toBe(32); // 16 + MED 6 + PROF 2 + NIV 2 + fixo 6.
    expect(cura.critico).toBe(true);
  });
});
