import type { TipoCampanhaMembroPapelEnum } from '../../enums';

/**
 * DTOs do módulo `campanha` — CRUD de campanha (m2-04). Seguem a fórmula
 * `Entidade + Complemento? + Verbo + Dto` (CONVENTIONS / skill `dto-conventions`):
 * entrada no infinitivo, saída no particípio, `Interno` marca o que trafega apenas entre
 * service e repository (nunca chega ao frontend). O `codigo_convite` é gerado na service e
 * viaja só nos DTOs internos e nas saídas — a entrada pública nunca o informa.
 *
 * `descricao` é opcional na entrada (a coluna é anulável) e volta como `string | null` nas
 * saídas quando a campanha não tem descrição.
 */

/** Entrada de criação de campanha — o criador vira `MESTRE` (SYSTEM.SPEC §14). */
export interface CampanhaCriarDto {
  readonly nome: string;
  readonly descricao?: string;
}

/** Saída de criação — a campanha criada, já com o `codigoConvite` gerado. */
export interface CampanhaCriadaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
}

/**
 * Entrada da listagem "minhas campanhas" — o `usuarioId` vem do JWT (`@ActiveUser().sub`),
 * injetado no DTO pela controller (nunca primitivo solto). A saída é sempre resumida
 * (`CampanhaResumoDto`).
 */
export interface CampanhaListarDto {
  readonly usuarioId: number;
}

/**
 * Item de listagem — a campanha de que o usuário é membro, com o `papel` dele nela
 * (`MESTRE`/`JOGADOR`). Recorte enxuto: sem `codigoConvite` (gestão de convite é m2-05).
 */
export interface CampanhaResumoDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/**
 * Entrada de recuperação individual — o `id` vem do `@Param`, injetado no DTO pela
 * controller (recuperação individual sempre `{ id }`, nunca primitivo).
 */
export interface CampanhaRecuperarDto {
  readonly id: number;
}

/** Saída da recuperação individual — a campanha completa, incluindo o `codigoConvite`. */
export interface CampanhaRecuperadaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
}

/** Entrada pública da alteração de campanha (nome/descrição) — só o mestre pode alterar. */
export interface CampanhaAlterarDto {
  readonly nome: string;
  readonly descricao?: string;
}

/** Saída da alteração — a campanha alterada. */
export interface CampanhaAlteradaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
}

/** Entrada da exclusão (soft delete) — só o mestre pode excluir. */
export interface CampanhaExcluirDto {
  readonly id: number;
}

/**
 * Entrada interna do `CampanhaRepository.criarCampanha` — o `codigoConvite` já foi gerado na
 * service. `Interno` porque nunca trafega ao frontend (a entrada pública não informa o código).
 */
export interface CampanhaInternoCriarDto {
  readonly nome: string;
  readonly descricao?: string;
  readonly codigoConvite: string;
}

/**
 * Entrada interna do `CampanhaRepository.alterarCampanha` — o `id` vem no DTO (nunca
 * `alterar(id, dados)`), montado pela controller com o `@Param`.
 */
export interface CampanhaInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao?: string;
}

/**
 * Entrada interna de criação do vínculo `campanha_membro` — o `papel` é o `codigo`
 * (`MESTRE`/`JOGADOR`); o repositório traduz `codigo → id` da tabela
 * `tipo_campanha_membro_papel` no SQL (§10.2.12).
 */
export interface CampanhaMembroInternoCriarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/**
 * Entrada interna da consulta de vínculo de um usuário numa campanha — base das checagens
 * de permissão da service (membro/mestre). Só service ↔ repository.
 */
export interface CampanhaMembroInternoRecuperarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Saída interna da consulta de vínculo — o `papel` do usuário na campanha (`codigo`
 * traduzido de `tipo_campanha_membro_papel` no SQL). `null` na service quando não há vínculo.
 */
export interface CampanhaMembroInternoRecuperadoDto {
  readonly papel: TipoCampanhaMembroPapelEnum;
}
