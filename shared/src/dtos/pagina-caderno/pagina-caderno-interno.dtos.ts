import type { BuscaCampanhaFonteEnum, TipoPaginaCadernoEnum } from '../../enums';

/** Entrada interna para criar uma página colaborativa sem autor individual. */
export interface PaginaCadernoEsquadraoInternoCriarDto {
  readonly campanhaId: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly estadoColaborativo: Uint8Array;
}

/** Entrada interna de atualização CRDT e de sua projeção pesquisável. */
export interface PaginaCadernoEsquadraoInternoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly estadoColaborativo: Uint8Array;
}

/** Entrada interna da criação após autoria e campanha serem resolvidas pela service. */
export interface PaginaCadernoInternoCriarDto {
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}

/** Entrada interna da listagem por campanha e autor. */
export interface PaginaCadernoInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
}

/** Entrada interna da listagem do caderno de um membro-alvo. */
export interface PaginaCadernoMembroInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
}

/** Entrada interna da alteração com concorrência otimista. */
export interface PaginaCadernoInternoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly updatedDate: string;
}

/** Forma persistida da página; `somenteLeitura` é acrescentado pela service. */
export interface PaginaCadernoInternoRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioAutorId: number | null;
  readonly autorNome: string | null;
  readonly tipo: TipoPaginaCadernoEnum;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly estadoColaborativo: Uint8Array | null;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/** Consulta interna após papel, fontes e paginação serem validados pela service. */
export interface BuscaCampanhaInternoDto {
  readonly campanhaId: number;
  readonly usuarioAtivoId: number;
  readonly termo: string;
  readonly fontes: readonly BuscaCampanhaFonteEnum[];
  readonly pagina: number;
  readonly limite: number;
}
