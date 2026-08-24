import { describe, expect, it } from 'vitest';
import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  CustoAcaoEnum,
  HabilidadeTipoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '../../enums';
import type { FichaCriaturaDadosDto } from '../../dtos/ficha';
import { obterBaseELimitePorVd, validarRealocacaoAtributos } from './atributos';
import { calcularAtributoEfetivo } from './modificadores';
import { calcularVidaMaxima } from './saude';
import { calcularDefesaBase, possuiContraAtaque } from './defesa';
import { calcularLimiteResistencias, validarFraqueza } from './resistencia';
import { sugerirDeslocamentoTerrestre } from './deslocamento';
import { obterDanoReferenciaPorVd } from './ataques';
import { validarFichaCriatura } from './validacao';

/**
 * Caso de teste completo do critério de aceite do milestone `m4-02`: encadeia o motor de
 * regras inteiro reproduzindo "A Estátua" (docs/core/guia_de_mestre-v4.0.0.md — "Guia de
 * Criação de Ameaças" > "Exemplo de Ficha Completa").
 *
 * Duas divergências entre a fórmula geral do documento e os números literais do exemplo
 * foram identificadas (decisão de abertura da m4-02: a fórmula geral vence — ela é a regra
 * reutilizável; o exemplo é uma aplicação pontual, mais sujeita a erro de transcrição):
 *
 * 1. Modificador Fraco em VD 30: a fórmula dá -2 + 5×1,5 = 5,5 → 5 (arredondado para baixo,
 *    regra explícita do documento); o exemplo mostra "+6" para os três atributos Fraco da
 *    Estátua. Forte, Médio e Frágil do mesmo exemplo batem exatamente com a fórmula.
 * 2. Mínimo de Fraqueza: a fórmula dá max(5, 52÷2) = 26 (soma de resistências 36+16=52); o
 *    exemplo declara a Fraqueza de Explosão em 20, abaixo do próprio mínimo que a fórmula do
 *    mesmo documento exige. `validarFraqueza(20, 52)` corretamente reporta `false`; a ficha
 *    completa abaixo usa 26 (valor mínimo real) para fechar sem violações.
 *
 * O Deslocamento Terrestre da Estátua (9m) também cai fora da faixa sugerida para Destreza 4
 * (10–12m) — não é tratado como divergência: `sugerirDeslocamentoTerrestre` é uma sugestão
 * que o Mestre pode substituir livremente, e o conceito da Estátua (só se move quando não
 * observada) já justifica um valor abaixo da referência.
 */
describe('Caso de teste completo — "A Estátua"', () => {
  const vd = 30;

  const atributosFinais = {
    forca: 3, destreza: 4, luta: 5, pontaria: 2,
    vigor: 3, intelecto: 2, medicina: 2, sentidos: 3,
    social: 0, vontade: 2,
  };

  it('Atributos: Base 2, Limite 5, 6 Pontos de Ajuste — atributos finais dentro do limite', () => {
    expect(obterBaseELimitePorVd({ vd })).toEqual({ base: 2, limite: 5, pontosAjuste: 6 });
    expect(validarRealocacaoAtributos({ atributosFinal: atributosFinais, limite: 5 })).toEqual([]);
  });

  it('Modificadores: Atributo Efetivo de cada linha da ficha', () => {
    expect(calcularAtributoEfetivo({ atributoFinal: 3, modificador: ModificadorCriaturaEnum.MEDIO, vd })).toBe(12); // Força 3 [Médio +9]
    expect(calcularAtributoEfetivo({ atributoFinal: 4, modificador: ModificadorCriaturaEnum.FORTE, vd })).toBe(16); // Destreza 4 [Forte +12]
    expect(calcularAtributoEfetivo({ atributoFinal: 5, modificador: ModificadorCriaturaEnum.FORTE, vd })).toBe(17); // Luta 5 [Forte +12]
    expect(calcularAtributoEfetivo({ atributoFinal: 2, modificador: ModificadorCriaturaEnum.FRAGIL, vd })).toBe(4); // Pontaria 2 [Frágil +2]
  });

  it('Saúde: Vida Máxima = 30 × 35 (Tenacidade Padrão) = 1.050', () => {
    expect(calcularVidaMaxima({ vd, tenacidade: TenacidadeEnum.PADRAO })).toBe(1050);
  });

  it('Defesa: 15 + 30÷2 = 30; Contra-Ataque disponível (Luta Forte)', () => {
    expect(calcularDefesaBase({ vd })).toBe(30);
    expect(possuiContraAtaque(ModificadorCriaturaEnum.FORTE)).toBe(true);
  });

  it('Resistências: Limite 60 (VD×2, sem fraqueza extra); Físico 36 + Balístico 16 = 52 ≤ 60', () => {
    expect(calcularLimiteResistencias({ vd, quantidadeFraquezasExtras: 0 })).toBe(60);
  });

  it('Fraqueza: mínimo real é 26 (divergência documentada — o exemplo do doc usa 20)', () => {
    expect(validarFraqueza({ valor: 20, somaResistencias: 52 })).toBe(false);
    expect(validarFraqueza({ valor: 26, somaResistencias: 52 })).toBe(true);
  });

  it('Deslocamento: Destreza 4 sugere 10–12m (a Estátua usa 9m — sugestão, não trava)', () => {
    expect(sugerirDeslocamentoTerrestre({ destreza: 4 })).toEqual({ minimo: 10, maximo: 12 });
  });

  it('Ataques: dano de referência de Movimento e Padrão batem com "Pancada" e "Esmagamento"', () => {
    expect(obterDanoReferenciaPorVd({ vd, custoAcao: CustoAcaoEnum.MOVIMENTO })).toBe('3D12+4');
    expect(obterDanoReferenciaPorVd({ vd, custoAcao: CustoAcaoEnum.PADRAO })).toBe('4D12+10');
  });

  it('Ficha completa (Fraqueza ajustada ao mínimo real de 26) não tem violações de coerência', () => {
    const ficha: FichaCriaturaDadosDto = {
      identidade: {
        designacao: 'A Estátua',
        origem: OrigemCriaturaEnum.SCP_ADAPTADO,
        conceito: 'Uma figura de pedra humanoide que só se move quando ninguém a observa diretamente.',
        naturezaFisica: 'Humanoide, altura entre 1,8m e 2,1m, aparência de pedra calcária escura. Sem feições definidas.',
        comportamento: ComportamentoCriaturaEnum.CACADORA,
        motivacao: 'Desconhecida. Não demonstra comunicação, territorialidade ou padrão de seleção de alvos.',
        ganchoUnico: 'Imóvel enquanto observada. Letal em frações de segundo quando não é.',
        temaHorror: 'Paranoia, atenção dividida, cooperação forçada.',
      },
      na: NivelAmeacaEnum.MEDIA,
      vd,
      atributos: atributosFinais,
      modificadores: {
        destreza: ModificadorCriaturaEnum.FORTE,
        luta: ModificadorCriaturaEnum.FORTE,
        forca: ModificadorCriaturaEnum.MEDIO,
        vigor: ModificadorCriaturaEnum.MEDIO,
        sentidos: ModificadorCriaturaEnum.MEDIO,
        intelecto: ModificadorCriaturaEnum.FRACO,
        medicina: ModificadorCriaturaEnum.FRACO,
        vontade: ModificadorCriaturaEnum.FRACO,
        pontaria: ModificadorCriaturaEnum.FRAGIL,
        social: ModificadorCriaturaEnum.FRAGIL,
      },
      tenacidade: TenacidadeEnum.PADRAO,
      vidaMaxima: 1050,
      vidaAtual: 1050,
      defesa: 30,
      resistencias: [
        { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 36 },
        { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 16 },
      ],
      fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 26 }],
      porte: PorteCriaturaEnum.MEDIO,
      deslocamento: { terrestre: 9 },
      cadencia: CadenciaEnum.SINGULAR,
      ataques: [
        {
          nome: 'Pancada',
          teste: '5d20kh1+12', // Luta 5D20+12 (docs/core/guia_de_mestre-v4.0.0.md).
          custoAcao: CustoAcaoEnum.MOVIMENTO,
          dano: '3D12+4',
          danoCritico: '6D12+8', // Crítico dobra dados e fixo (sistema-v4.1.0.md § Crítico).
          area: false,
        },
        {
          nome: 'Esmagamento',
          teste: '5d20kh1+12', // Luta 5D20+12 (docs/core/guia_de_mestre-v4.0.0.md).
          custoAcao: CustoAcaoEnum.PADRAO,
          dano: '4D12+10',
          danoCritico: '8D12+20', // Crítico dobra dados e fixo (sistema-v4.1.0.md § Crítico).
          area: false,
          efeito: 'O alvo realiza um teste de Vigor (DT 20) ou fica Imobilizado por 1 turno.',
        },
      ],
      habilidades: [
        {
          nome: 'Imobilidade Absoluta',
          tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
          descricao:
            'Enquanto ao menos um agente mantiver contato visual direto com a criatura, ela não pode se mover, ' +
            'atacar ou usar habilidades de nenhum tipo. Dano, condições e efeitos externos continuam a afetá-la normalmente.',
        },
        {
          nome: 'Velocidade Impossível',
          tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
          descricao:
            'Quando não está sendo observada, a criatura ignora o custo de Ação de Movimento para se deslocar.',
        },
        {
          nome: 'Ruptura de Observação',
          tipo: HabilidadeTipoCriaturaEnum.GATILHO,
          descricao:
            'Quando o número de agentes com contato visual direto com a criatura cai para zero por qualquer ' +
            'motivo, ela age imediatamente fora da ordem de iniciativa com uma Ação Padrão.',
        },
      ],
    };

    expect(validarFichaCriatura(ficha)).toEqual({ violacoes: [] });
  });
});
