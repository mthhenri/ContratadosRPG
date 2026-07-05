import { describe, expect, it } from 'vitest';
import { QualidadeDescansoEnum, TipoDescansoEnum } from '../../enums';
import {
  calcularDescanso,
  calcularResultadoDescanso,
  interpretarDadosExtras,
  rolarDados,
} from './descanso';

/**
 * Regras de descanso conferidas contra docs/core/sistema-v4.1.0.md — "Descanso":
 * fórmula `ATRIBUTO dados de descanso + (Nível × 2)`, modificadores de qualidade
 * (Insalubre −1 / Adequado 0 / Confortável +1), refeição (+1), Descanso Curto
 * sem recuperação de Vida e interrupção (metade do valor, arredondando para
 * baixo). Sem divergências numéricas vs `contratados-calculadora/src/script.js`.
 */
describe('calcularDescanso', () => {
  it('reproduz o exemplo do documento: Nível 3, Destreza 4, Curto insalubre → 4D3+6 de Energia', () => {
    const calculo = calcularDescanso({
      tipo: TipoDescansoEnum.CURTO,
      qualidade: QualidadeDescansoEnum.INSALUBRE,
      vigor: 0,
      destreza: 4,
      nivel: 3,
      refeicao: false,
      interrompido: false,
    });

    expect(calculo.modificadorDado).toBe(-1);
    expect(calculo.energia.dadoFinal).toBe(3);
    expect(calculo.energia.quantidadeDados).toBe(4);
    expect(calculo.energia.bonusNivel).toBe(6);
    // 4D3+6 → mínimo 4×1+6, máximo 4×3+6, média 4×2+6
    expect(calculo.energia.minimo).toBe(10);
    expect(calculo.energia.media).toBe(14);
    expect(calculo.energia.maximo).toBe(18);
  });

  it('Descanso Curto não recupera Vida', () => {
    const calculo = calcularDescanso({
      tipo: TipoDescansoEnum.CURTO,
      qualidade: QualidadeDescansoEnum.ADEQUADO,
      vigor: 5,
      destreza: 3,
      nivel: 2,
      refeicao: false,
      interrompido: false,
    });

    expect(calculo.vida).toBeNull();
  });

  it('Descanso Médio adequado recupera Energia (1D6) e Vida (1D4)', () => {
    const calculo = calcularDescanso({
      tipo: TipoDescansoEnum.MEDIO,
      qualidade: QualidadeDescansoEnum.ADEQUADO,
      vigor: 2,
      destreza: 3,
      nivel: 1,
      refeicao: false,
      interrompido: false,
    });

    expect(calculo.modificadorDado).toBe(0);
    // Energia: 3D6+2 → min 3+2, média 3×3.5+2, max 18+2
    expect(calculo.energia.dadoFinal).toBe(6);
    expect(calculo.energia.minimo).toBe(5);
    expect(calculo.energia.media).toBe(12.5);
    expect(calculo.energia.maximo).toBe(20);
    // Vida: 2D4+2 → min 2+2, média 2×2.5+2, max 8+2
    expect(calculo.vida).not.toBeNull();
    expect(calculo.vida?.dadoFinal).toBe(4);
    expect(calculo.vida?.minimo).toBe(4);
    expect(calculo.vida?.media).toBe(7);
    expect(calculo.vida?.maximo).toBe(10);
  });

  it('Longo confortável com refeição sobe os dados 2 tipos (D8→D12 Energia, D6→D10 Vida)', () => {
    const calculo = calcularDescanso({
      tipo: TipoDescansoEnum.LONGO,
      qualidade: QualidadeDescansoEnum.CONFORTAVEL,
      vigor: 3,
      destreza: 2,
      nivel: 0,
      refeicao: true,
      interrompido: false,
    });

    expect(calculo.modificadorDado).toBe(2);
    expect(calculo.energia.dadoFinal).toBe(12);
    expect(calculo.vida?.dadoFinal).toBe(10);
  });

  it('interrupção divide mínimo e máximo por 2, arredondando para baixo', () => {
    const calculo = calcularDescanso({
      tipo: TipoDescansoEnum.MEDIO,
      qualidade: QualidadeDescansoEnum.ADEQUADO,
      vigor: 2,
      destreza: 3,
      nivel: 1,
      refeicao: false,
      interrompido: true,
    });

    // Energia bruta 3D6+2: min 5 → ⌊5÷2⌋=2, max 20 → 10
    expect(calculo.energia.minimo).toBe(2);
    expect(calculo.energia.maximo).toBe(10);
    expect(calculo.energia.interrompido).toBe(true);
  });
});

describe('interpretarDadosExtras', () => {
  it('interpreta notação NdM como rolagem de dados', () => {
    expect(interpretarDadosExtras({ texto: '1d6' })).toEqual({ quantidade: 1, faces: 6, bonusFixo: 0 });
    expect(interpretarDadosExtras({ texto: '3d4' })).toEqual({ quantidade: 3, faces: 4, bonusFixo: 0 });
  });

  it('normaliza espaços e maiúsculas', () => {
    expect(interpretarDadosExtras({ texto: '  2D6 ' })).toEqual({ quantidade: 2, faces: 6, bonusFixo: 0 });
  });

  it('limita a quantidade de dados a 20', () => {
    expect(interpretarDadosExtras({ texto: '25d6' })).toEqual({ quantidade: 20, faces: 6, bonusFixo: 0 });
  });

  it('interpreta inteiro positivo como bônus fixo', () => {
    expect(interpretarDadosExtras({ texto: '5' })).toEqual({ quantidade: 0, faces: 0, bonusFixo: 5 });
  });

  it('devolve null para vazio, "0", dado de menos de 2 faces e entrada inválida', () => {
    expect(interpretarDadosExtras({ texto: '' })).toBeNull();
    expect(interpretarDadosExtras({ texto: '   ' })).toBeNull();
    expect(interpretarDadosExtras({ texto: '0' })).toBeNull();
    expect(interpretarDadosExtras({ texto: '2d1' })).toBeNull();
    expect(interpretarDadosExtras({ texto: 'abc' })).toBeNull();
  });
});

describe('calcularResultadoDescanso', () => {
  it('soma dados de recuperação, dados extras e bônus de Nível', () => {
    const resultado = calcularResultadoDescanso({
      rolagens: [2, 3, 1],
      dadosExtras: [4],
      bonusNivel: 6,
      interrompido: false,
    });

    expect(resultado.soma).toBe(16);
    expect(resultado.total).toBe(16);
    expect(resultado.interrompido).toBe(false);
  });

  it('trata bônus fixo como um único valor extra', () => {
    const resultado = calcularResultadoDescanso({
      rolagens: [3, 3],
      dadosExtras: [5],
      bonusNivel: 0,
      interrompido: false,
    });

    expect(resultado.total).toBe(11);
  });

  it('interrupção divide a soma final por 2, arredondando para baixo', () => {
    const resultado = calcularResultadoDescanso({
      rolagens: [2, 5],
      dadosExtras: [],
      bonusNivel: 6,
      interrompido: true,
    });

    // soma bruta 13 → ⌊13÷2⌋ = 6
    expect(resultado.soma).toBe(13);
    expect(resultado.total).toBe(6);
  });

  it('sem rolagens nem extras, o total é o bônus de Nível', () => {
    const resultado = calcularResultadoDescanso({
      rolagens: [],
      dadosExtras: [],
      bonusNivel: 8,
      interrompido: false,
    });

    expect(resultado.total).toBe(8);
  });
});

describe('rolarDados', () => {
  it('rola a quantidade pedida, cada valor dentro de [1, faces]', () => {
    const valores = rolarDados({ faces: 6, quantidade: 50 });
    expect(valores).toHaveLength(50);
    for (const valor of valores) {
      expect(valor).toBeGreaterThanOrEqual(1);
      expect(valor).toBeLessThanOrEqual(6);
    }
  });

  it('devolve lista vazia quando a quantidade é 0', () => {
    expect(rolarDados({ faces: 8, quantidade: 0 })).toEqual([]);
  });
});
