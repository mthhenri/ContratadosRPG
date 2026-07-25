import { FragmentoModuloEnum, FragmentoTipoEnum, ModificacaoEfeitoTipoEnum } from '../../enums';
import {
  BONUS_POTENCIALIZADOR,
  CUSTO_ENERGIA_MAXIMA_MODULO,
  VALOR_AFINIDADE_MODULO,
} from './fragmento.dados';
import { ModificacaoEfeitoDto } from './compras.dtos';

/**
 * Custos de Energia, Afinidade e Preço de Sanidade dos Fragmentos (m3-35/m3-42) — funções puras
 * conferidas contra `docs/core/sistema-v4.1.0.md` — "⬡ Fragmentos" (ver `fragmento.dados.ts` para
 * o que fica de fora).
 */

/**
 * Custo em Energia Máxima de **adquirir** um fragmento — o dobro para Construtor (doc — "⬦
 * Construtor").
 */
export function custoAquisicaoFragmento(tipo: FragmentoTipoEnum, modulo: FragmentoModuloEnum): number {
  const base = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  return tipo === FragmentoTipoEnum.CONSTRUTOR ? base * 2 : base;
}

/** Débito de Energia atual **e** Energia Máxima ao **acoplar** um Potencializador a um item/ser. */
export interface CustoAcoplarFragmentoDto {
  readonly energia: number;
  readonly energiaMaxima: number;
}

/**
 * Custo de **acoplar** um fragmento Potencializador (doc — "⬥ Acoplamento": "acoplar um fragmento
 * de módulo IV em um item custa 7 de Energia + 7 de Energia Máxima"). Só Potencializador acopla —
 * Construtor **é** a peça, não se prende a outra.
 */
export function custoAcoplarFragmento(modulo: FragmentoModuloEnum): CustoAcoplarFragmentoDto {
  const custo = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  return { energia: custo, energiaMaxima: custo };
}

/** Custo de **remover** (desacoplar) um fragmento aplicado: Energia × 2 (doc — "⬥ Acoplamento"). */
export function custoRemoverFragmento(modulo: FragmentoModuloEnum): number {
  return CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * 2;
}

/** Uma opção selecionável do cardápio de bônus "em um item" do Potencializador. */
export interface OpcaoBonusFragmentoDto {
  readonly rotulo: string;
  readonly efeito: ModificacaoEfeitoDto;
}

/**
 * Cardápio de bônus "em um item" de um fragmento Potencializador de `modulo` — o jogador escolhe
 * UMA opção ao aplicar (doc — "⬦ Potencializador", tabela). Mapeado aos `ModificacaoEfeitoTipoEnum`
 * já existentes (`DANO_DADOS_BASE`/`BONUS_TESTE`/`DANO_FIXO`/`RESISTENCIA`) — zero motor novo em
 * `calcularStatItem`, que já soma esses tipos vindos de qualquer modificação custom.
 */
export function listarBonusFragmentoPotencializador(
  modulo: FragmentoModuloEnum,
): readonly OpcaoBonusFragmentoDto[] {
  const valores = BONUS_POTENCIALIZADOR[modulo];
  return [
    {
      rotulo: `+${valores.dadosBase} dados no dado base (dano)`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: valores.dadosBase },
    },
    {
      rotulo: `+${valores.dadoTeste} dado(s) no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.dadoTeste, variante: 'DADO' },
    },
    {
      rotulo: `+${valores.valorFixo} no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.valorFixo, variante: 'FIXO' },
    },
    {
      rotulo: `+${valores.valorFixo} de dano (efeito)`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: valores.valorFixo },
    },
    {
      rotulo: `+${valores.valorFixo} de resistência`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: valores.valorFixo },
    },
  ];
}

// === Afinidade (m3-42) ===

/** Afinidade que um único fragmento de `modulo` contribui (doc — "⬥ Afinidade com Fragmentos"). */
export function valorAfinidadeFragmento(modulo: FragmentoModuloEnum): number {
  return VALOR_AFINIDADE_MODULO[modulo];
}

/** Afinidade total de um agente: soma da Afinidade de cada fragmento portado (mesma seção do doc). */
export function calcularAfinidade(modulosPortados: readonly FragmentoModuloEnum[]): number {
  return modulosPortados.reduce((total, modulo) => total + valorAfinidadeFragmento(modulo), 0);
}

/**
 * Redução de Energia no custo de fragmentos por excesso de Afinidade acima de 10 (doc: "acima de
 * 10... redução... igual a -1 de Energia para cada 2 pontos excedidos do limite de afinidade").
 */
export function reducaoCustoPorAfinidade(afinidade: number): number {
  return Math.floor(Math.max(0, afinidade - 10) / 2);
}

/**
 * Aplica a redução de Afinidade a um custo de Energia de fragmento, sem nunca zerá-lo (doc: "Não é
 * possível anular o custo de um fragmento... deve ter o custo de, no mínimo, 1 de Energia Máxima").
 */
export function aplicarReducaoAfinidade(custo: number, afinidade: number): number {
  return Math.max(1, custo - reducaoCustoPorAfinidade(afinidade));
}

// === Preço de Sanidade do Consumo (m3-42) ===

/** Preço de Sanidade (mental + físico) de **consumir** um fragmento (doc — "⬦ Consumo de Fragmentos"). */
export interface PrecoSanidadeConsumoDto {
  /** Quantas vezes a sequela "Rejeição Biológica" é aplicada (doc: "multiplicada por Módulo - 6"). */
  readonly multiplicadorSequela: number;
  /** DT de Vontade para evitar a sequela (doc: "DT 7 + (Módulo - 6) × 5"). */
  readonly dtEvitarVontade: number;
  /**
   * Energia Máxima adicional perdida — preço físico, cobrado independente do teste de Vontade
   * (doc: "removendo ainda mais de sua Energia Máxima, sendo igual ao custo do módulo multiplicado
   * por 3").
   */
  readonly energiaMaximaExtra: number;
}

/**
 * Preço de Sanidade de **consumir** um fragmento de `modulo` (doc — "⬦ Consumo de Fragmentos").
 * Exemplo do documento: módulo IV remove 21 de Energia Máxima extra (custo 7 × 3).
 */
export function custoSanidadeConsumirFragmento(modulo: FragmentoModuloEnum): PrecoSanidadeConsumoDto {
  const multiplicadorSequela = valorAfinidadeFragmento(modulo);
  return {
    multiplicadorSequela,
    dtEvitarVontade: 7 + multiplicadorSequela * 5,
    energiaMaximaExtra: CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * 3,
  };
}
