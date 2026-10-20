import type {
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoEnum,
  TipoDocumentoOrganizacaoEnum,
} from '../../enums';

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

/**
 * Entrada interna de "informar leitura" (`m9-09`): o `DocumentoLeituraInformarDto` do cliente com o
 * id da conexão (socket) que o `CampanhaGateway` acrescenta — `CampanhaGateway` → `DocumentoService`.
 */
export interface DocumentoLeituraInternoInformarDto {
  readonly conexaoId: string;
  readonly campanhaId: number;
  readonly documentoId: number | null;
}

/**
 * Entrada interna do registro de presença já validado pela `DocumentoService` (`m9-09`):
 * `documentoId` só chega não nulo quando o usuário pode ler aquele documento daquela campanha.
 */
export interface DocumentoLeituraInternoRegistrarDto {
  readonly conexaoId: string;
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum;
  readonly documentoId: number | null;
}

/**
 * Entrada interna da limpeza da presença de uma conexão (`m9-09`). `campanhaId` `null` limpa em
 * qualquer campanha (desconexão); com valor, só se a leitura for daquela campanha (`campanha:sair`).
 */
export interface DocumentoLeituraConexaoInternoRemoverDto {
  readonly conexaoId: string;
  readonly campanhaId: number | null;
}

/** Entrada interna da limpeza da presença de um usuário numa campanha (papel alterado/revogado). */
export interface DocumentoLeituraUsuarioInternoRemoverDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/** Entrada interna da limpeza dos leitores não-mestre de um documento ocultado ou removido. */
export interface DocumentoLeituraDocumentoInternoRemoverDto {
  readonly campanhaId: number;
  readonly documentoId: number;
}
/** Recuperação interna após autorização da projeção; exige revelação e campanha coincidente. */
export interface DocumentoReveladoInternoRecuperarDto {
  readonly id: number;
  readonly campanhaId: number;
}

// ── Pastas da Biblioteca ────────────────────────────────────────────────────

/** Uma pasta como o repositório a devolve — com a organização e a campanha a que pertence. */
export interface DocumentoPastaInternoRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
  readonly nome: string;
  readonly pastaMaeId: number | null;
  readonly ordem: number;
}

/** Entrada interna da leitura da organização de um cargo. */
export interface DocumentoOrganizacaoInternoListarDto {
  readonly campanhaId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
}

/** Entrada interna da criação de pasta — a `ordem` é calculada no `INSERT ... SELECT`. */
export interface DocumentoPastaInternoCriarDto {
  readonly campanhaId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
  readonly nome: string;
  readonly pastaMaeId: number | null;
}

/** Entrada interna de renomear a pasta. */
export interface DocumentoPastaInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
}

/** Entrada interna da posição de uma pasta (mãe + ordem entre as irmãs). */
export interface DocumentoPastaPosicaoInternoAlterarDto {
  readonly id: number;
  readonly pastaMaeId: number | null;
  readonly ordem: number;
}

/** Entrada interna da exclusão lógica de uma pasta e de todas as suas descendentes. */
export interface DocumentoPastaInternoRemoverDto {
  readonly id: number;
}

/** Entrada interna da posição de um documento numa pasta. */
export interface DocumentoVinculoInternoAlterarDto {
  readonly documentoId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
  readonly pastaId: number;
  readonly ordem: number;
}

/** Entrada interna de devolver o documento à raiz de uma organização. */
export interface DocumentoVinculoInternoRemoverDto {
  readonly documentoId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
}

/** Entrada interna de limpar o vínculo de um documento em **todas** as organizações. */
export interface DocumentoVinculosInternoRemoverDto {
  readonly documentoId: number;
}
