import { describe, expect, it } from 'vitest';
import { ClasseEnum } from '../../enums';
import { calcularBeneficiosNivel, calcularProgressaoAcumulada } from './progressao';

/**
 * Progressão conferida contra docs/core/sistema-v4.1.0.md — tabela de "Progressão"
 * (agente, Níveis 0–20) e "Jogando como um Civil" > "Treinamentos" (0–5). Consome
 * as tabelas `dadosAgente`/`dadosCivil` migradas na m1-01 (fonte única).
 */
describe('calcularBeneficiosNivel', () => {
  it('agente: retorna os benefícios do Nível informado', () => {
    expect(calcularBeneficiosNivel({ classe: ClasseEnum.COMBATENTE, nivel: 3 })).toEqual([
      '+1 Atributo',
      '+1 Habilidade Geral',
      '+1 Habilidade de Classe ou Arquétipo',
      '+1D6+1 de dano furtivo',
    ]);
  });

  it('agente: Nível 0 não tem ganhos', () => {
    expect(calcularBeneficiosNivel({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toEqual([]);
  });

  it('civil: retorna os benefícios do Treinamento informado', () => {
    expect(calcularBeneficiosNivel({ classe: ClasseEnum.CIVIL, nivel: 1 })).toEqual([
      'Treinamento Iniciante',
      '+1 Habilidade Civil',
      '+1 Atributo',
    ]);
  });

  it('Nível fora da faixa retorna lista vazia', () => {
    expect(calcularBeneficiosNivel({ classe: ClasseEnum.COMBATENTE, nivel: 25 })).toEqual([]);
    expect(calcularBeneficiosNivel({ classe: ClasseEnum.CIVIL, nivel: 9 })).toEqual([]);
  });
});

describe('calcularProgressaoAcumulada', () => {
  it('agente Nível 0: tudo zerado', () => {
    expect(calcularProgressaoAcumulada({ classe: ClasseEnum.COMBATENTE, nivel: 0 })).toEqual({
      atributos: 0,
      habilidadesGerais: 0,
      habilidadesClasse: 0,
      habilidadesClasseOuArquetipo: 0,
      habilidadesOutraClasse: 0,
      fortificacoes: 0,
      habilidadesCivis: 0,
    });
  });

  it('agente Nível 20: acumula todos os ganhos da tabela', () => {
    expect(calcularProgressaoAcumulada({ classe: ClasseEnum.COMBATENTE, nivel: 20 })).toEqual({
      atributos: 30,
      habilidadesGerais: 12,
      habilidadesClasse: 5,
      habilidadesClasseOuArquetipo: 10,
      habilidadesOutraClasse: 4,
      fortificacoes: 2,
      habilidadesCivis: 0,
    });
  });

  it('agente Nível 7: soma parcial correta', () => {
    // Atributos: níveis 1,3,5,7 = +1 cada; 2,4,6 = +2 cada → 4 + 6 = 10
    // Fortificação aparece pela 1ª vez no Nível 7
    expect(calcularProgressaoAcumulada({ classe: ClasseEnum.COMBATENTE, nivel: 7 })).toEqual({
      atributos: 10,
      habilidadesGerais: 4,
      habilidadesClasse: 2,
      habilidadesClasseOuArquetipo: 4,
      habilidadesOutraClasse: 1,
      fortificacoes: 1,
      habilidadesCivis: 0,
    });
  });

  it('civil Treinamento 5: conta atributos, habilidades civis e a de classe da Elite', () => {
    expect(calcularProgressaoAcumulada({ classe: ClasseEnum.CIVIL, nivel: 5 })).toEqual({
      atributos: 3,
      habilidadesGerais: 0,
      habilidadesClasse: 1,
      habilidadesClasseOuArquetipo: 0,
      habilidadesOutraClasse: 0,
      fortificacoes: 0,
      habilidadesCivis: 5,
    });
  });
});
