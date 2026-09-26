import type { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '../../enums';
import type { FichaImagemArquivoDto } from '../ficha/ficha-operacao.dtos';

/**
 * DTOs do módulo `documento` (M9, "Biblioteca") — o documento de campanha que o mestre cria oculto
 * e revela aos jogadores. O contrato da entidade nasceu em `m9-01`; os de comportamento
 * (revelar/ocultar/reordenar/listar/imagem/evento), em `m9-02`; os de busca, em `m9-03`.
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

/** Entrada da listagem da biblioteca de uma campanha — o `campanhaId` vem da rota. */
export interface DocumentoListarDto {
  readonly campanhaId: number;
}

/** Entrada de "revelar à mesa" — o `id` vem da rota. */
export interface DocumentoRevelarDto {
  readonly id: number;
}

/** Saída de "revelar à mesa". */
export interface DocumentoReveladoDto {
  readonly id: number;
  readonly revelado: boolean;
  readonly updatedDate: string;
}

/** Entrada de "ocultar da mesa" — o `id` vem da rota. */
export interface DocumentoOcultarDto {
  readonly id: number;
}

/** Saída de "ocultar da mesa". */
export interface DocumentoOcultadoDto {
  readonly id: number;
  readonly revelado: boolean;
  readonly updatedDate: string;
}

/**
 * Entrada da reordenação da biblioteca — o `campanhaId` vem da rota. `ordem` lista os ids de
 * **todos** os documentos ativos da campanha, na nova ordem.
 */
export interface DocumentoReordenarDto {
  readonly campanhaId: number;
  readonly ordem: readonly number[];
}

/**
 * Entrada da troca da imagem de um documento `IMAGEM` — o `id` vem da rota; `arquivo` é montado
 * pela controller a partir do `Express.Multer.File` (mesmo value object do avatar da ficha). MIME e
 * tamanho são validados na service pelos limites de `documento.validators.ts`.
 */
export interface DocumentoImagemAlterarDto {
  readonly id: number;
  readonly arquivo: FichaImagemArquivoDto;
}

/** Saída da troca da imagem. */
export interface DocumentoImagemAlteradaDto {
  readonly id: number;
  readonly imagemUrl: string;
  readonly updatedDate: string;
}

/**
 * Payload de `documento:alterado`. Só avisa **que** algo mudou (`documentoId` é `null` numa
 * reordenação): sem título, conteúdo nem `imagemUrl` — quem precisa do dado o busca por REST, já
 * recortado pelo papel. O nome foge de `DocumentoAlteradoDto`, que é a saída do `PUT`.
 */
export interface DocumentoBibliotecaAlteradaDto {
  readonly campanhaId: number;
  readonly documentoId: number | null;
  readonly alteracao: DocumentoAlteracaoEnum;
}

/**
 * Consulta da busca textual na biblioteca (`m9-03`) — o `campanhaId` vem da rota. Tem endpoint
 * próprio, fora da busca do caderno: o papel e o recorte são outros (o espectador busca o revelado).
 * Limites de termo e página reusam os do caderno (`BUSCA_CAMPANHA_*`).
 */
export interface DocumentoBuscarDto {
  readonly campanhaId: number;
  readonly termo: string;
  readonly pagina?: number;
  readonly limite?: number;
}

/**
 * Item da busca na biblioteca. `trecho` traz o termo entre `⟦ ⟧` (contrato do caderno).
 * `revelado` deixa a tela do mestre distinguir o oculto sem outra consulta — para jogador e
 * espectador é sempre `true`. A resposta é `PaginatedResult<DocumentoBuscaResultadoDto>`.
 */
export interface DocumentoBuscaResultadoDto {
  readonly id: number;
  readonly titulo: string;
  readonly tipo: TipoDocumentoEnum;
  readonly trecho: string;
  readonly revelado: boolean;
  readonly updatedDate: string;
  readonly relevancia: number;
}
