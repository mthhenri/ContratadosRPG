import type { CenaStatusEnum, CenaTipoEnum, TipoDocumentoEnum } from '../../enums';

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

/** Linha crua de `cena_documento`, já com os campos do documento resolvidos pelo `JOIN` (m7-25). */
export interface CenaDocumentoLinhaDto {
  readonly id: number;
  readonly cenaId: number;
  readonly documentoId: number;
  readonly ordem: number;
  readonly emFoco: boolean;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly revelado: boolean;
}

/** Entrada interna de "anexar" — `ordem` já decidida pela service (fim da fila). */
export interface CenaDocumentoInternoCriarDto {
  readonly cenaId: number;
  readonly documentoId: number;
  readonly ordem: number;
}

/** Entrada interna da reordenação de um item de `cena_documento`. */
export interface CenaDocumentoOrdemInternoAlterarDto {
  readonly id: number;
  readonly ordem: number;
}

/** Troca o vínculo em foco; `null` limpa explicitamente a seleção da cena. */
export interface CenaDocumentoFocoInternoDefinirDto {
    readonly cenaId: number;
    readonly id: number | null;
}
