import type { CenaStatusEnum, CenaTipoEnum, TipoDocumentoEnum } from '../../enums';
import type { EncontroRecuperadoDto } from '../encontro/encontro.dtos';

/**
 * DTOs do módulo `cena` (m7-cenas) — a raiz tipada da mesa, da qual o `encontro` (iniciativa) é
 * uma estrutura opcional. O contrato de criação nasceu em `m7-21`; os de condução
 * (abrir/encerrar/reordenar/listar/recuperar) e o broadcast, em `m7-22`.
 */

/**
 * Entrada da criação da cena — o `campanhaId` vem da rota. `ativarImediatamente` cria a cena já
 * `ATIVA` (encerrando a ativa atual da campanha); caso contrário nasce `PLANEJADA`.
 */
export interface CenaCriarDto {
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly ativarImediatamente: boolean;
}

/** Saída da criação — a cena recém-criada. */
export interface CenaCriadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly status: CenaStatusEnum;
}

/** Entrada da recuperação individual da cena (recuperação individual sempre `{ id }`). */
export interface CenaRecuperarDto {
  readonly id: number;
}

/** Entrada de "abrir" (`PLANEJADA → ATIVA`) — o `id` vem da rota. */
export interface CenaAbrirDto {
  readonly id: number;
}

/** Entrada de "encerrar" (`ATIVA → ENCERRADA`) — o `id` vem da rota. */
export interface CenaEncerrarDto {
  readonly id: number;
}

/**
 * Entrada da reordenação das cenas `PLANEJADA` da campanha — o `campanhaId` vem da rota. `ordem`
 * lista os ids de **todas** as cenas planejadas, na nova ordem (a primeira é a próxima a abrir).
 */
export interface CenaReordenarDto {
  readonly campanhaId: number;
  readonly ordem: readonly number[];
}

/**
 * Item de listagem das cenas de uma campanha. `temEncontro` diz se a cena tem a estrutura de
 * iniciativa (`encontro`) pendurada — o id do encontro só chega pelo estado completo.
 */
export interface CenaResumoDto {
  readonly id: number;
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly status: CenaStatusEnum;
  readonly temEncontro: boolean;
}

/**
 * Estado completo da cena. `encontro` é o estado do encontro dela **já no recorte de quem pediu**
 * (revelação m7-06) — `null` quando o tipo não tem iniciativa (`cenaTemIniciativa`).
 */
export interface CenaRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly status: CenaStatusEnum;
  readonly encontro: EncontroRecuperadoDto | null;
}

/**
 * Payload de broadcast (`cena:alterada`) — o resumo da cena após uma mutação já persistida,
 * emitido pela service **depois** de salvar (§9, broadcast-only). Cena `PLANEJADA` só chega à sala
 * do mestre (trava anti-vazamento, m7-22); o estado do encontro segue pelo `encontro:alterado`.
 */
export interface CenaAlteradaDto {
  readonly campanhaId: number;
  readonly cena: CenaResumoDto;
}

/**
 * DTOs do painel de Investigação (`m7-25`) — a coluna Documentos anexa itens da biblioteca da M9 a
 * uma cena, em `cena_documento` (cena, documento, ordem, em foco). A visibilidade do documento em
 * si nunca é duplicada aqui: quem sabe se está revelado é a `DocumentoService` (M9) — "apresentar" a
 * chama, nunca o repository dela.
 */

/** Entrada de "anexar documento" — o `cenaId` vem da rota. */
export interface CenaDocumentoAnexarDto {
  readonly documentoId: number;
}

/**
 * Item da coluna Documentos. Campos do documento embutidos direto (sem herança de DTO de negócio,
 * §CONVENTIONS) — a coluna não busca o documento à parte para montar a lista.
 */
export interface CenaDocumentoResumoDto {
  readonly documentoId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly revelado: boolean;
  readonly ordem: number;
  readonly emFoco: boolean;
}

/** Entrada da reordenação — `ordem` lista os `documentoId` de todos os itens da cena, na nova ordem. */
export interface CenaDocumentoReordenarDto {
  readonly ordem: readonly number[];
}

/** Entrada de "remover da cena" — não afeta a biblioteca (M9), só o vínculo. */
export interface CenaDocumentoRemoverDto {
  readonly documentoId: number;
}

/** Entrada de "focar no palco" — só o mestre; não revela nem chega à mesa. */
export interface CenaDocumentoFocarDto {
  readonly documentoId: number;
}

/** Entrada de "apresentar" — revela o documento (M9) e o marca em foco no palco. */
export interface CenaDocumentoApresentarDto {
  readonly documentoId: number;
}

/**
 * Payload de broadcast (`cena:documento-alterado`) — dataless como `campanha:inventario-alterado`:
 * só avisa que a coluna Documentos desta cena mudou; quem recebe refaz o `GET` já no próprio
 * recorte (mestre vê tudo; jogador/espectador, só o revelado).
 */
export interface CenaDocumentoAlteradoDto {
  readonly campanhaId: number;
  readonly cenaId: number;
}
