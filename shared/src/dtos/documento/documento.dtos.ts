import type { TipoDocumentoEnum } from '../../enums';

/**
 * DTOs do módulo `documento` (M9, "Biblioteca") — o documento de campanha que o mestre cria oculto
 * e revela aos jogadores. O contrato da entidade nasceu em `m9-01`; os de comportamento
 * (revelar/ocultar/reordenar/listar/imagem/evento) chegam em `m9-02` e os de busca em `m9-03`.
 * Limites em `validators/documento.validators.ts`.
 */

/**
 * Entrada da criação. `conteudoMarkdown` só faz sentido para `TEXTO`; a imagem de um documento
 * `IMAGEM` chega depois, por upload (`m9-02`). Todo documento nasce oculto.
 */
export interface DocumentoCriarDto {
  readonly campanhaId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly conteudoMarkdown?: string;
}

/** Saída da criação — o documento recém-criado. */
export interface DocumentoCriadoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly conteudoMarkdown: string | null;
  readonly imagemUrl: string | null;
  readonly revelado: boolean;
  readonly ordem: number;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/** Entrada da recuperação individual de um documento. */
export interface DocumentoRecuperarDto {
  readonly id: number;
}

/** Saída da recuperação individual — o documento completo, com o conteúdo para o leitor. */
export interface DocumentoRecuperadoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly conteudoMarkdown: string | null;
  readonly imagemUrl: string | null;
  readonly revelado: boolean;
  readonly ordem: number;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/**
 * Entrada da alteração com a versão otimista (`updatedDate`) que o cliente editou.
 * `conteudoMarkdown` é `null` para `IMAGEM`; a imagem troca por upload próprio (`m9-02`).
 */
export interface DocumentoAlterarDto {
  readonly id: number;
  readonly titulo: string;
  readonly conteudoMarkdown: string | null;
  readonly updatedDate: string;
}

/** Saída da alteração — o documento como ficou persistido. */
export interface DocumentoAlteradoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly conteudoMarkdown: string | null;
  readonly imagemUrl: string | null;
  readonly revelado: boolean;
  readonly ordem: number;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/** Entrada da exclusão lógica de um documento. */
export interface DocumentoRemoverDto {
  readonly id: number;
}

/**
 * Item de listagem da biblioteca. Sem `conteudoMarkdown` (até 100 000 caracteres por item — o
 * leitor recupera o documento inteiro); com `imagemUrl` porque a lista mostra a miniatura.
 */
export interface DocumentoResumoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly imagemUrl: string | null;
  readonly revelado: boolean;
  readonly ordem: number;
  readonly updatedDate: string;
}
