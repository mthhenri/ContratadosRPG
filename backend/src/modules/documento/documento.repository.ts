import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  DocumentoImagemInternoAlterarDto,
  DocumentoInternoAlterarDto,
  DocumentoInternoCriarDto,
  DocumentoInternoListarDto,
  DocumentoListarDto,
  DocumentoOrdemInternoAlterarDto,
  DocumentoRecuperadoDto,
  DocumentoRecuperarDto,
  DocumentoRemoverDto,
  DocumentoResumoDto,
  DocumentoRevelacaoInternoAlterarDto,
} from '@contratados-rpg/shared/dtos/documento';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `documento` (m9-02) — SQL bruto only, sem lógica de negócio. Dono das
 * queries de `documento`; permissão, coerência tipo × conteúdo e o recorte por papel são arbitrados
 * na `DocumentoService` (o recorte chega aqui como `apenasRevelados` e vira `WHERE`). `tipo` traduz
 * `codigo ↔ id` de `tipo_documento` no SQL — a service só vê `TipoDocumentoEnum`.
 *
 * As datas saem como texto ISO com microssegundos (`dataComoTexto`, mesmo formato do caderno): a
 * versão otimista de `alterarDocumento` compara `updated_date` por igualdade, e o cliente devolve
 * exatamente o texto que recebeu.
 */
@Injectable()
export class DocumentoRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'documento');
  }

  /** `timestamptz` como texto ISO em UTC, com microssegundos. */
  private dataComoTexto(coluna: string): string {
    return `to_char(${coluna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
  }

  /** `JOIN` que resolve o `codigo` do tipo. */
  private juncaoTipo(): string {
    return `INNER JOIN tipo_documento
              ON tipo_documento.id = documento.tipo_documento_id
             AND tipo_documento.is_deleted = false`;
  }

  /**
   * Insere o documento **oculto** no fim da biblioteca — a `ordem` é calculada no próprio
   * `INSERT ... SELECT` (maior ordem ativa da campanha + 1). `busca` não é informada: o trigger
   * `trg_documento_busca` a preenche.
   */
  async criarDocumento(dto: DocumentoInternoCriarDto): Promise<DocumentoRecuperadoDto> {
    const [documentoInserido] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO documento
         (campanha_id, tipo_documento_id, titulo, conteudo_markdown, imagem_url, revelado, ordem,
          created_date, updated_date, is_deleted)
       SELECT :campanhaId,
              (SELECT id FROM tipo_documento WHERE codigo = :tipo AND is_deleted = false),
              :titulo, :conteudoMarkdown, NULL, false,
              (SELECT COALESCE(MAX(documento_ordem.ordem), 0) + 1
               FROM documento AS documento_ordem
               WHERE documento_ordem.campanha_id = :campanhaId
                 AND documento_ordem.is_deleted = false),
              NOW(), NOW(), false
       RETURNING id`,
      {
        campanhaId: dto.campanhaId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        conteudoMarkdown: dto.conteudoMarkdown,
      },
    );
    return this.recuperarPorId({ id: documentoInserido.id }) as Promise<DocumentoRecuperadoDto>;
  }

  /** Documento completo por id, ou `null` quando não existe/está excluído. */
  async recuperarPorId(dto: DocumentoRecuperarDto): Promise<DocumentoRecuperadoDto | null> {
    const [documentoEncontrado] = await this.executarConsulta<DocumentoRecuperadoDto>(
      `SELECT documento.id, documento.campanha_id AS "campanhaId", documento.titulo,
              tipo_documento.codigo AS tipo, documento.conteudo_markdown AS "conteudoMarkdown",
              documento.imagem_url AS "imagemUrl", documento.revelado, documento.ordem,
              ${this.dataComoTexto('documento.created_date')} AS "createdDate",
              ${this.dataComoTexto('documento.updated_date')} AS "updatedDate"
       FROM documento
       ${this.juncaoTipo()}
       WHERE documento.id = :id AND documento.is_deleted = false`,
      { id: dto.id },
    );
    return documentoEncontrado ?? null;
  }

  /**
   * Biblioteca da campanha na ordem manual do mestre, sem o conteúdo. Com `apenasRevelados`, os
   * ocultos nem saem do banco — é o recorte de jogador e espectador.
   */
  async listarPorCampanha(dto: DocumentoInternoListarDto): Promise<DocumentoResumoDto[]> {
    return this.executarConsulta<DocumentoResumoDto>(
      `SELECT documento.id, documento.campanha_id AS "campanhaId", documento.titulo,
              tipo_documento.codigo AS tipo, documento.imagem_url AS "imagemUrl",
              documento.revelado, documento.ordem,
              ${this.dataComoTexto('documento.updated_date')} AS "updatedDate"
       FROM documento
       ${this.juncaoTipo()}
       WHERE documento.campanha_id = :campanhaId
         AND documento.is_deleted = false
         AND (NOT :apenasRevelados::boolean OR documento.revelado = true)
       ORDER BY documento.ordem ASC, documento.id ASC`,
      { campanhaId: dto.campanhaId, apenasRevelados: dto.apenasRevelados },
    );
  }

  /** Ids de todos os documentos ativos da campanha — a service confere contra eles a nova ordem. */
  async listarIdsPorCampanha(dto: DocumentoListarDto): Promise<number[]> {
    const linhas = await this.executarConsulta<{ id: number }>(
      `SELECT documento.id
       FROM documento
       WHERE documento.campanha_id = :campanhaId AND documento.is_deleted = false`,
      { campanhaId: dto.campanhaId },
    );
    return linhas.map((linha) => linha.id);
  }

  /**
   * Grava título e markdown se a versão ainda for a que o cliente editou. Devolve `null` quando
   * `updated_date` já mudou (a service traduz em 409) — nada é sobrescrito.
   */
  async alterarDocumento(dto: DocumentoInternoAlterarDto): Promise<DocumentoRecuperadoDto | null> {
    const [documentoAlterado] = await this.executarConsulta<{ id: number }>(
      `UPDATE documento
       SET titulo = :titulo,
           conteudo_markdown = :conteudoMarkdown,
           updated_date = NOW()
       WHERE documento.id = :id
         AND documento.updated_date = :updatedDate::timestamptz
         AND documento.is_deleted = false
       RETURNING documento.id`,
      {
        id: dto.id,
        titulo: dto.titulo,
        conteudoMarkdown: dto.conteudoMarkdown,
        updatedDate: dto.updatedDate,
      },
    );
    return documentoAlterado ? this.recuperarPorId({ id: documentoAlterado.id }) : null;
  }

  /** Revela ou oculta o documento e devolve a linha atualizada. */
  async alterarRevelado(dto: DocumentoRevelacaoInternoAlterarDto): Promise<DocumentoRecuperadoDto> {
    await this.executarComando(
      `UPDATE documento
       SET revelado = :revelado
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, revelado: dto.revelado },
    );
    return this.recuperarPorId({ id: dto.id }) as Promise<DocumentoRecuperadoDto>;
  }

  /** Aponta o documento para a imagem já gravada no armazenamento. */
  async alterarImagem(dto: DocumentoImagemInternoAlterarDto): Promise<DocumentoRecuperadoDto> {
    await this.executarComando(
      `UPDATE documento
       SET imagem_url = :imagemUrl
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, imagemUrl: dto.imagemUrl },
    );
    return this.recuperarPorId({ id: dto.id }) as Promise<DocumentoRecuperadoDto>;
  }

  /** Grava a posição de um documento na biblioteca. */
  async alterarOrdem(dto: DocumentoOrdemInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE documento
       SET ordem = :ordem
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, ordem: dto.ordem },
    );
  }

  /** Exclusão lógica — o arquivo de imagem, se houver, continua no armazenamento. */
  async removerDocumento(dto: DocumentoRemoverDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
