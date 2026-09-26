import type { CenaStatusEnum, CenaTipoEnum } from '../../enums';

/**
 * DTOs **internos** do módulo `cena` — trafegam só entre `CenaService` e `CenaRepository`, nunca
 * chegam ao frontend. `Interno` vem antes do verbo (CONVENTIONS).
 */

/** Linha crua de `cena`, com o `codigo` de tipo/status resolvido e o encontro dela, se houver. */
export interface CenaLinhaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly status: CenaStatusEnum;
  readonly ordem: number;
  readonly encontroId: number | null;
}

/** Entrada interna da criação da cena — `status` e `ordem` já decididos pela service. */
export interface CenaInternoCriarDto {
  readonly campanhaId: number;
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly status: CenaStatusEnum;
  readonly ordem: number;
}

/** Entrada interna da troca de situação da cena (`PLANEJADA` → `ATIVA` → `ENCERRADA`). */
export interface CenaStatusInternoAlterarDto {
  readonly id: number;
  readonly status: CenaStatusEnum;
}

/** Entrada interna da reordenação de uma cena planejada. */
export interface CenaOrdemInternoAlterarDto {
  readonly id: number;
  readonly ordem: number;
}
