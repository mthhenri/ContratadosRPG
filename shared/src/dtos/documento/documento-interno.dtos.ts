import type { TipoDocumentoEnum } from '../../enums';

/**
 * DTOs **internos** do módulo `documento` — trafegam só entre `DocumentoService` e
 * `DocumentoRepository`, nunca chegam ao frontend. `Interno` vem antes do verbo (CONVENTIONS).
 */

/** Entrada interna da criação — título aparado e conteúdo já validados pela service. */
export interface DocumentoInternoCriarDto {
  readonly campanhaId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly conteudoMarkdown: string | null;
}

/**
 * Entrada interna da listagem. `apenasRevelados` é o recorte de quem não é mestre — o filtro vai
 * para o SQL, nunca para um `filter` depois da consulta.
 */
export interface DocumentoInternoListarDto {
  readonly campanhaId: number;
  readonly apenasRevelados: boolean;
}

/** Entrada interna da alteração com a versão otimista que o cliente editou. */
export interface DocumentoInternoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string | null;
  readonly updatedDate: string;
}

/** Entrada interna de revelar/ocultar. */
export interface DocumentoRevelacaoInternoAlterarDto {
  readonly id: number;
  readonly revelado: boolean;
}

/** Entrada interna da troca da imagem já gravada no armazenamento. */
export interface DocumentoImagemInternoAlterarDto {
  readonly id: number;
  readonly imagemUrl: string;
}

/** Entrada interna da posição de um documento na biblioteca. */
export interface DocumentoOrdemInternoAlterarDto {
  readonly id: number;
  readonly ordem: number;
}

/**
 * Entrada interna da busca, com termo aparado e página validada pela service. `apenasRevelados` é
 * o mesmo recorte da listagem e vira `WHERE` — a contagem usa o mesmo filtro.
 */
export interface DocumentoBuscaInternoDto {
  readonly campanhaId: number;
  readonly termo: string;
  readonly apenasRevelados: boolean;
  readonly pagina: number;
  readonly limite: number;
}
