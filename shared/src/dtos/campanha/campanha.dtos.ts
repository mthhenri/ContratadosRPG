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

/*
 * ── m2-05: entrada por convite, regeneração do código e listagem de membros ──────────────
 */

/**
 * Entrada de "entrar na campanha" — o usuário autenticado ingressa informando o
 * `codigoConvite`. O `usuarioId` do ingressante vem do JWT (`@ActiveUser().sub`), nunca do
 * corpo. Entra sempre com papel `JOGADOR` (SYSTEM.SPEC §14).
 */
export interface CampanhaEntrarDto {
  readonly codigoConvite: string;
}

/**
 * Saída de "entrar na campanha" — a campanha em que o usuário ingressou e o `papel` obtido
 * (`JOGADOR`). Recorte enxuto, sem o `codigoConvite` (visível só na recuperação de membro).
 */
export interface CampanhaEntradaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/**
 * Entrada da regeneração do convite (complemento `Convite` inteiro antes do verbo) — o `id`
 * vem do `@Param`, injetado no DTO pela controller. Só o mestre pode regenerar (§14).
 */
export interface CampanhaConviteRegenerarDto {
  readonly id: number;
}

/** Saída da regeneração — o novo `codigoConvite`, que invalida o anterior. */
export interface CampanhaConviteRegeneradoDto {
  readonly id: number;
  readonly codigoConvite: string;
}

/**
 * Entrada da listagem de membros de uma campanha (complemento coleção `Membros` no plural) —
 * o `campanhaId` vem do `@Param`, injetado no DTO pela controller. Visível aos membros da
 * campanha (permissão no service). A saída é sempre resumida (`CampanhaMembroResumoDto`).
 */
export interface CampanhaMembrosListarDto {
  readonly campanhaId: number;
}

/**
 * Item de listagem de membros — o usuário membro da campanha com o `papel` dele nela
 * (`MESTRE`/`JOGADOR`, `codigo` traduzido de `tipo_campanha_membro_papel` no SQL).
 */
export interface CampanhaMembroResumoDto {
  readonly usuarioId: number;
  readonly nome: string;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/**
 * Entrada interna da consulta de campanha por código de convite — base do `entrarCampanha`.
 * Só service ↔ repository (o `codigoConvite` chega no `CampanhaEntrarDto` público).
 */
export interface CampanhaConviteRecuperarDto {
  readonly codigoConvite: string;
}

/**
 * Entrada interna da persistência do novo convite — o `id` vem no DTO (nunca
 * `alterar(id, dados)`); o `codigoConvite` já foi gerado na service. Só service ↔ repository.
 */
export interface CampanhaConviteInternoAlterarDto {
  readonly id: number;
  readonly codigoConvite: string;
}

/*
 * ── m2-10: gestão de membros pelo mestre — remoção de jogador e transferência de mestre ──
 */

/**
 * Entrada da remoção de um membro pelo mestre (complemento `Membro` antes do verbo) — o `id`
 * é o da campanha (`@Param(':id')`) e o `usuarioId` é o membro a remover
 * (`@Param(':usuarioId')`), ambos injetados no DTO pela controller. Só o mestre remove (§14);
 * o mestre não pode remover a si mesmo.
 */
export interface CampanhaMembroRemoverDto {
  readonly id: number;
  readonly usuarioId: number;
}

/** Saída da remoção — confirmação do membro removido da campanha. */
export interface CampanhaMembroRemovidoDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada da transferência do papel de mestre (complemento `Mestre` antes do verbo) — o `id`
 * é o da campanha (`@Param`) e o `novoMestreUsuarioId` (corpo) é o jogador a ser promovido a
 * `MESTRE`. O mestre atual é o usuário autenticado; a transferência é **atômica** (promove o
 * alvo e rebaixa o atual a `JOGADOR`, mantendo exatamente um mestre — §14).
 */
export interface CampanhaMestreTransferirDto {
  readonly id: number;
  readonly novoMestreUsuarioId: number;
}

/** Saída da transferência — confirmação de quem deixou e quem assumiu o papel de mestre. */
export interface CampanhaMestreTransferidoDto {
  readonly campanhaId: number;
  readonly mestreAnteriorUsuarioId: number;
  readonly novoMestreUsuarioId: number;
}

/*
 * ── m3-05: payload do evento WebSocket `membro:entrou` (gateway broadcast-only, §9) ──────
 */

/**
 * Payload do evento de tempo real `membro:entrou`, emitido na sala `campanha:<id>` pela
 * `CampanhaService.entrarCampanha` após a mutação (SYSTEM.SPEC §9 — broadcast-only). Avisa os
 * membros já conectados de que um novo `usuarioId` ingressou na campanha. É a notificação para a
 * sala (recorte `campanhaId` + `usuarioId`); o verbo vai no particípio (CONVENTIONS — saída), na
 * mesma forma de `CampanhaEntradaDto` (a resposta REST devolvida ao próprio ingressante), da qual
 * este DTO é distinto (o complemento `Membro` marca a notificação da sala).
 */
export interface CampanhaMembroEntradaDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada interna da remoção do vínculo `campanha_membro` (soft delete pela chave composta
 * campanha+usuário). Só service ↔ repository.
 */
export interface CampanhaMembroInternoRemoverDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada interna da transferência de mestre — troca atômica dos papéis dos dois membros num
 * único `UPDATE`: `mestreAtualUsuarioId` vira `JOGADOR` e `novoMestreUsuarioId` vira `MESTRE`.
 * Só service ↔ repository.
 */
export interface CampanhaMestreInternoTransferirDto {
  readonly campanhaId: number;
  readonly mestreAtualUsuarioId: number;
  readonly novoMestreUsuarioId: number;
}
