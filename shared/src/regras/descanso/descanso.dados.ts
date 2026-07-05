import { QualidadeDescansoEnum, TipoDescansoEnum } from '../../enums';

/**
 * Escada de tipos de dado (die ladder), em ordem crescente. Um "modificador de
 * qualidade" (§ `ajustarDado`) move um passo nesta escada: Insalubre desce 1,
 * Confortável e Refeição sobem 1. O ramo inferior (D3) é confirmado pelo
 * documento — o exemplo "Descanso Curto insalubre" reduz o 1D4 de Energia para
 * 1D3 (docs/core/sistema-v4.1.0.md — "Descanso").
 *
 * A escada é a mesma primitiva usada pela aba compras (a antiga `_DIE_LADDER` do
 * site, idêntica à `DADOS_SEQ` do descanso); por isso vive aqui como utilidade
 * compartilhada e é reexportada pelo barrel. O descanso só exercita a faixa
 * D3–D12; os degraus superiores (D20) existem para o `elevarDado` de compras
 * (m1-05).
 */
export const ESCADA_DADOS: readonly number[] = [3, 4, 6, 8, 10, 12, 20];

/**
 * Dados de recuperação por tempo de descanso: quantos dados de Energia/Vida se
 * rola (a quantidade vem do atributo — Destreza para Energia, Vigor para Vida).
 * Descanso Curto não recupera Vida.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Descanso" (Curto 1D4/—, Médio 1D6/1D4,
 * Longo 1D8/1D6). Sem divergências vs `contratados-calculadora/src/script.js`
 * (`DADOS_DESCANSO`).
 */
export interface DescansoTipoDados {
  /** Faces do dado de recuperação de Energia (rolado em quantidade = Destreza). */
  readonly dadoEnergia: number;
  /** Faces do dado de recuperação de Vida (rolado em quantidade = Vigor); `null` quando o tipo não recupera Vida. */
  readonly dadoVida: number | null;
  /** Se o tipo de descanso recupera Vida (Curto não recupera). */
  readonly recuperaVida: boolean;
}

export const DADOS_DESCANSO: Readonly<Record<TipoDescansoEnum, DescansoTipoDados>> = {
  [TipoDescansoEnum.CURTO]: { dadoEnergia: 4, dadoVida: null, recuperaVida: false },
  [TipoDescansoEnum.MEDIO]: { dadoEnergia: 6, dadoVida: 4, recuperaVida: true },
  [TipoDescansoEnum.LONGO]: { dadoEnergia: 8, dadoVida: 6, recuperaVida: true },
};

/**
 * Modificador de qualidade do ambiente sobre os dados de recuperação, em passos
 * na `ESCADA_DADOS`: Insalubre reduz 1 tipo, Adequado é padrão, Confortável
 * aumenta 1 tipo.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Descanso" (Níveis de Descanso). Sem
 * divergências vs `contratados-calculadora/src/script.js` (`QUALIDADE_MOD`).
 */
export const QUALIDADE_MOD: Readonly<Record<QualidadeDescansoEnum, number>> = {
  [QualidadeDescansoEnum.INSALUBRE]: -1,
  [QualidadeDescansoEnum.ADEQUADO]: 0,
  [QualidadeDescansoEnum.CONFORTAVEL]: 1,
};

/** Passo somado ao modificador de qualidade quando o agente consome uma Refeição no descanso (+1 tipo de dado). */
export const REFEICAO_MOD = 1;
