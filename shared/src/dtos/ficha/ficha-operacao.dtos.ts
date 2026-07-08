import type { ClasseEnum, TipoFichaEnum } from '../../enums';
import type { FichaJogadorDadosDto } from './ficha.dtos';

/**
 * DTOs de **operação** do módulo `ficha` — o CRUD da ficha de jogador (m3-03). Seguem a
 * fórmula `Entidade + Complemento? + Verbo + Dto` (CONVENTIONS / skill `dto-conventions`):
 * entrada no infinitivo, saída no particípio, `Interno` marca o que trafega apenas entre
 * service e repository (nunca chega ao frontend).
 *
 * ── Relacional × JSONB (SYSTEM.SPEC §10.4) ───────────────────────────────────
 * `campanhaId`/`usuarioId`/`nome` são colunas de `ficha` (identidade, posse). O
 * conteúdo de jogo viaja inteiro no campo `dados` (`FichaJogadorDadosDto`, m3-01);
 * as listagens leem só um recorte (`dados->>'classe'`, `dados->>'nivel'`) — daí o
 * `FichaResumoDto` enxuto.
 *
 * O `usuarioId` do dono e a permissão nunca chegam pelo corpo da requisição: o dono
 * é o usuário autenticado (`@ActiveUser().sub`) e a matriz de permissões (§14) é
 * arbitrada pela service. A ficha criada aqui é sempre do tipo `JOGADOR` (criatura/NPC
 * é M4).
 */

/**
 * Entrada de criação de ficha de jogador — o `dono` é o usuário autenticado
 * (`@ActiveUser().sub`, nunca no corpo); a ficha entra na `campanhaId` informada, com o tipo
 * `JOGADOR`. O `dados` é o documento de jogo completo (validado contra `shared/regras` na
 * service antes de persistir).
 */
export interface FichaCriarDto {
  readonly campanhaId: number;
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/** Saída de criação — a ficha criada (identidade/posse + documento de jogo). */
export interface FichaCriadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada da listagem de fichas de uma campanha — o `campanhaId` vem do `@Query`, injetado no
 * DTO pela controller. O recorte visível depende do papel do autor (§14): o mestre vê todas as
 * fichas da campanha; um membro vê as próprias e as concedidas (`usuario_ficha_acesso`). A saída
 * é sempre resumida (`FichaResumoDto`).
 */
export interface FichaListarDto {
  readonly campanhaId: number;
}

/**
 * Item de listagem — recorte enxuto da ficha, com os campos de jogo lidos do JSONB
 * (`dados->>'classe'`, `dados->>'nivel'` — §10.4). `usuarioId` é o dono, para o front distinguir
 * "minha ficha" das demais.
 */
export interface FichaResumoDto {
  readonly id: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly classe: ClasseEnum;
  readonly nivel: number;
}

/**
 * Entrada de recuperação individual — o `id` vem do `@Param`, injetado no DTO pela controller
 * (recuperação individual sempre `{ id }`, nunca primitivo).
 */
export interface FichaRecuperarDto {
  readonly id: number;
}

/** Saída da recuperação individual — a ficha completa (identidade/posse + documento de jogo). */
export interface FichaRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada pública da alteração completa da ficha — `nome` + documento de jogo `dados`. Só o dono
 * ou o mestre podem alterar (§14); a permissão e a validação via `shared/regras` são arbitradas
 * na service. O `id` vem no DTO interno (nunca `alterar(id, dados)`).
 */
export interface FichaAlterarDto {
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/** Saída da alteração — a ficha alterada. */
export interface FichaAlteradaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/** Entrada da exclusão (soft delete) — o `id` vem do `@Param`. Só o dono ou o mestre podem. */
export interface FichaExcluirDto {
  readonly id: number;
}

/**
 * Entrada interna do `FichaRepository.criarFicha` — inclui o `usuarioId` do dono (resolvido do
 * JWT na service) e o `tipo` (`codigo` de `tipo_ficha`; o repositório traduz `codigo → id` no
 * SQL — §10.2.12). Só service ↔ repository.
 */
export interface FichaInternoCriarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly tipo: TipoFichaEnum;
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada interna do `FichaRepository.alterarFicha` — o `id` vem no DTO (nunca `alterar(id,
 * dados)`), montado pela controller com o `@Param`. Só service ↔ repository.
 */
export interface FichaInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada interna da listagem das fichas **visíveis** a um membro comum numa campanha (as do
 * próprio dono ou concedidas por `usuario_ficha_acesso`). Só service ↔ repository — o mestre usa
 * a listagem completa (`FichaListarDto`).
 */
export interface FichaVisiveisInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada interna da consulta de concessão de visualização (`usuario_ficha_acesso`) de um usuário
 * sobre uma ficha — base da checagem de permissão de visualização de um membro comum (§14). Só
 * service ↔ repository.
 */
export interface FichaAcessoInternoRecuperarDto {
  readonly fichaId: number;
  readonly usuarioId: number;
}

/**
 * Saída interna da consulta de concessão — o `id` da linha de `usuario_ficha_acesso` quando
 * existe (a service só verifica a presença). `null` na service quando não há concessão.
 */
export interface FichaAcessoInternoRecuperadoDto {
  readonly id: number;
}
