import { TIPOS_DANO_BLOQUEAVEIS, TipoDanoEnum } from '../../enums';

/**
 * Regra pura do "receber dano" (m7-17) — o tomador de dano facilitado do mestre e do jogador.
 * Fonte: docs/core/sistema-v4.1.0.md — "⬥ Tipos de Dano" e "⬦ Resistências". A regra é
 * **assimétrica** entre Geral e os quatro tipos bloqueáveis:
 *
 * - **Dano Geral** é irredutível — entra inteiro no total, sem resistência própria.
 * - **Resistência Geral** reduz *qualquer* dano bloqueável, mas como uma camada acima, aplicada
 *   **uma única vez** sobre a soma dos residuais — nunca repetida por linha (`docs/specs/active/
 *   m7-17-receber-dano.spec.md`).
 */

/** Uma linha de dano por tipo bloqueável — sempre presente, mesmo com `bruto: 0`. */
export interface DanoRecebidoLinhaDto {
  readonly tipo: TipoDanoEnum;
  readonly bruto: number;
  readonly resistencia: number;
  readonly efetivo: number;
}

/** Entrada de `calcularDanoRecebido`. */
export interface DanoRecebidoCalcularDto {
  /** Dano bruto informado por tipo (inclui `GERAL`) — tipo ausente equivale a 0. */
  readonly brutos: Partial<Record<TipoDanoEnum, number>>;
  /** Resistência da ficha por tipo (inclui `GERAL`) — tipo ausente equivale a 0. */
  readonly resistenciasFicha: Partial<Record<TipoDanoEnum, number>>;
  /** Resistência custom (efeito de cena) por tipo, somada à da ficha — tipo ausente equivale a 0. */
  readonly resistenciasCustom?: Partial<Record<TipoDanoEnum, number>>;
}

/** Resultado de `calcularDanoRecebido`. */
export interface DanoRecebidoResultadoDto {
  /** Uma linha por tipo bloqueável, na ordem canônica de `TIPOS_DANO_BLOQUEAVEIS`. */
  readonly porTipo: readonly DanoRecebidoLinhaDto[];
  /** Soma dos `efetivo` das linhas bloqueáveis, antes da resistência Geral. */
  readonly residualBloqueavel: number;
  /** `residualBloqueavel` após a resistência Geral (ficha + custom), piso 0. */
  readonly residualPosGeral: number;
  /** Dano Geral bruto informado — irredutível, entra inteiro no total. */
  readonly danoGeral: number;
  /** `residualPosGeral + danoGeral` — o valor a abater da Vida. */
  readonly total: number;
}

/** Soma a base da ficha com o ajuste custom para um tipo, tipo ausente valendo 0. */
function resistenciaTotal(
  tipo: TipoDanoEnum,
  ficha: Partial<Record<TipoDanoEnum, number>>,
  custom: Partial<Record<TipoDanoEnum, number>> | undefined,
): number {
  return (ficha[tipo] ?? 0) + (custom?.[tipo] ?? 0);
}

export function calcularDanoRecebido(dto: DanoRecebidoCalcularDto): DanoRecebidoResultadoDto {
  const porTipo = TIPOS_DANO_BLOQUEAVEIS.map((tipo) => {
    const bruto = dto.brutos[tipo] ?? 0;
    const resistencia = resistenciaTotal(tipo, dto.resistenciasFicha, dto.resistenciasCustom);
    const efetivo = Math.max(0, bruto - resistencia);
    return { tipo, bruto, resistencia, efetivo };
  });

  const residualBloqueavel = porTipo.reduce((soma, linha) => soma + linha.efetivo, 0);
  const resistenciaGeral = resistenciaTotal(
    TipoDanoEnum.GERAL,
    dto.resistenciasFicha,
    dto.resistenciasCustom,
  );
  const residualPosGeral = Math.max(0, residualBloqueavel - resistenciaGeral);
  const danoGeral = dto.brutos[TipoDanoEnum.GERAL] ?? 0;

  return {
    porTipo,
    residualBloqueavel,
    residualPosGeral,
    danoGeral,
    total: residualPosGeral + danoGeral,
  };
}
