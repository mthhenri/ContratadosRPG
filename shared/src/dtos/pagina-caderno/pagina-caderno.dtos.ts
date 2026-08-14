import type { BuscaCampanhaFonteEnum, BuscaCampanhaResultadoTipoEnum } from '../../enums';

/** Entrada da criação de uma página no caderno do usuário autenticado. */
export interface PaginaCadernoCriarDto {
  readonly campanhaId: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}

/** Entrada da alteração com a versão otimista que o cliente editou. */
export interface PaginaCadernoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly updatedDate: string;
}

/** Entrada da recuperação individual de uma página. */
export interface PaginaCadernoRecuperarDto {
  readonly id: number;
}

/** Entrada da exclusão lógica de uma página. */
export interface PaginaCadernoExcluirDto {
  readonly id: number;
}

/** Entrada da listagem do caderno do usuário autenticado. */
export interface PaginaCadernoListarDto {
  readonly campanhaId: number;
}

/** Entrada da listagem de um caderno de jogador pelo mestre. */
export interface PaginaCadernoMembroListarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/** Item enxuto da lista de páginas de um caderno. */
export interface PaginaCadernoResumoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
  readonly autorNome: string;
  readonly titulo: string;
  readonly updatedDate: string;
}

/** Página completa já recortada pela permissão do solicitante. */
export interface PaginaCadernoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly usuarioAutorId: number;
  readonly autorNome: string;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
  readonly somenteLeitura: boolean;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/** Consulta calculada da busca textual da campanha. */
export interface BuscaCampanhaDto {
  readonly campanhaId: number;
  readonly termo: string;
  readonly fontes?: readonly BuscaCampanhaFonteEnum[];
  readonly pagina?: number;
  readonly limite?: number;
}

/** Item normalizado que pode representar uma página ou anotações de ficha. */
export interface BuscaCampanhaResultadoDto {
  readonly tipo: BuscaCampanhaResultadoTipoEnum;
  readonly id: number;
  readonly titulo: string;
  readonly trecho: string;
  readonly autorNome: string;
  readonly fichaNome?: string;
  readonly updatedDate: string;
  readonly relevancia: number;
}
