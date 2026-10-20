import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  DocumentoOrganizacaoInternoListarDto,
  DocumentoPastaInternoAlterarDto,
  DocumentoPastaInternoCriarDto,
  DocumentoPastaInternoRecuperadaDto,
  DocumentoPastaInternoRemoverDto,
  DocumentoPastaPosicaoInternoAlterarDto,
  DocumentoPastaVinculoDto,
  DocumentoVinculoInternoAlterarDto,
  DocumentoVinculoInternoRemoverDto,
  DocumentoVinculosInternoRemoverDto,
} from '@contratados-rpg/shared/dtos/documento';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório das pastas da Biblioteca — SQL bruto only. `documento_pasta` guarda a árvore de cada
 * organização (cargo) e `documento_pasta_vinculo` diz em que pasta está cada documento, no máximo
 * um por documento e por organização; documento sem vínculo está na raiz. A organização chega como
 * `codigo` de `tipo_documento_organizacao` e o SQL traduz para o id. Permissão, profundidade e
 * posição são arbitradas na `DocumentoPastaService`.
 */
@Injectable()
export class DocumentoPastaRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'documento_pasta');
  }

  /** Colunas de uma pasta no formato `DocumentoPastaInternoRecuperadaDto`. */
  private colunasPasta(): string {
    return `documento_pasta.id, documento_pasta.campanha_id AS "campanhaId",
            tipo_documento_organizacao.codigo AS organizacao, documento_pasta.nome,
            documento_pasta.documento_pasta_mae_id AS "pastaMaeId", documento_pasta.ordem`;
  }

  private juncaoOrganizacao(): string {
    return `INNER JOIN tipo_documento_organizacao
              ON tipo_documento_organizacao.id = documento_pasta.tipo_documento_organizacao_id
             AND tipo_documento_organizacao.is_deleted = false`;
  }

  /** Pastas ativas de uma organização, na ordem entre irmãs. */
  async listarPastas(
    dto: DocumentoOrganizacaoInternoListarDto,
  ): Promise<DocumentoPastaInternoRecuperadaDto[]> {
    return this.executarConsulta<DocumentoPastaInternoRecuperadaDto>(
      `SELECT ${this.colunasPasta()}
       FROM documento_pasta
       ${this.juncaoOrganizacao()}
       WHERE documento_pasta.campanha_id = :campanhaId
         AND tipo_documento_organizacao.codigo = :organizacao
         AND documento_pasta.is_deleted = false
       ORDER BY documento_pasta.ordem ASC, documento_pasta.id ASC`,
      { campanhaId: dto.campanhaId, organizacao: dto.organizacao },
    );
  }

  /**
   * Vínculos ativos de uma organização. Na organização `JOGADOR` só saem documentos revelados — o
   * recorte vai ao SQL, e um vínculo de documento oculto ou excluído nunca aparece.
   */
  async listarVinculos(
    dto: DocumentoOrganizacaoInternoListarDto & { apenasRevelados: boolean },
  ): Promise<DocumentoPastaVinculoDto[]> {
    return this.executarConsulta<DocumentoPastaVinculoDto>(
      `SELECT documento_pasta_vinculo.documento_id AS "documentoId",
              documento_pasta_vinculo.documento_pasta_id AS "pastaId",
              documento_pasta_vinculo.ordem
       FROM documento_pasta_vinculo
       INNER JOIN tipo_documento_organizacao
         ON tipo_documento_organizacao.id = documento_pasta_vinculo.tipo_documento_organizacao_id
        AND tipo_documento_organizacao.is_deleted = false
       INNER JOIN documento
         ON documento.id = documento_pasta_vinculo.documento_id
        AND documento.is_deleted = false
       INNER JOIN documento_pasta
         ON documento_pasta.id = documento_pasta_vinculo.documento_pasta_id
        AND documento_pasta.is_deleted = false
       WHERE documento.campanha_id = :campanhaId
         AND tipo_documento_organizacao.codigo = :organizacao
         AND documento_pasta_vinculo.is_deleted = false
         AND (NOT :apenasRevelados::boolean OR documento.revelado = true)
       ORDER BY documento_pasta_vinculo.ordem ASC, documento_pasta_vinculo.id ASC`,
      {
        campanhaId: dto.campanhaId,
        organizacao: dto.organizacao,
        apenasRevelados: dto.apenasRevelados,
      },
    );
  }

  /** Pasta por id, ou `null` quando não existe/está excluída. */
  async recuperarPasta(id: number): Promise<DocumentoPastaInternoRecuperadaDto | null> {
    const [pasta] = await this.executarConsulta<DocumentoPastaInternoRecuperadaDto>(
      `SELECT ${this.colunasPasta()}
       FROM documento_pasta
       ${this.juncaoOrganizacao()}
       WHERE documento_pasta.id = :id AND documento_pasta.is_deleted = false`,
      { id },
    );
    return pasta ?? null;
  }

  /** Cria a pasta no fim das irmãs — a `ordem` é calculada no próprio `INSERT ... SELECT`. */
  async criarPasta(
    dto: DocumentoPastaInternoCriarDto,
  ): Promise<DocumentoPastaInternoRecuperadaDto> {
    const [pastaInserida] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO documento_pasta
         (campanha_id, tipo_documento_organizacao_id, documento_pasta_mae_id, nome, ordem,
          created_date, updated_date, is_deleted)
       SELECT :campanhaId,
              (SELECT id FROM tipo_documento_organizacao
               WHERE codigo = :organizacao AND is_deleted = false),
              :pastaMaeId::integer, :nome,
              (SELECT COALESCE(MAX(irma.ordem), 0) + 1
               FROM documento_pasta AS irma
               WHERE irma.campanha_id = :campanhaId
                 AND irma.tipo_documento_organizacao_id = (
                   SELECT id FROM tipo_documento_organizacao
                   WHERE codigo = :organizacao AND is_deleted = false)
                 AND irma.documento_pasta_mae_id IS NOT DISTINCT FROM :pastaMaeId::integer
                 AND irma.is_deleted = false),
              NOW(), NOW(), false
       RETURNING id`,
      {
        campanhaId: dto.campanhaId,
        organizacao: dto.organizacao,
        pastaMaeId: dto.pastaMaeId,
        nome: dto.nome,
      },
    );
    return (await this.recuperarPasta(pastaInserida.id)) as DocumentoPastaInternoRecuperadaDto;
  }

  /** Renomeia a pasta. */
  async alterarPasta(dto: DocumentoPastaInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE documento_pasta
       SET nome = :nome
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, nome: dto.nome },
    );
  }

  /** Grava a pasta-mãe e a posição entre as irmãs. */
  async alterarPosicaoPasta(dto: DocumentoPastaPosicaoInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE documento_pasta
       SET documento_pasta_mae_id = :pastaMaeId::integer, ordem = :ordem
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, pastaMaeId: dto.pastaMaeId, ordem: dto.ordem },
    );
  }

  /** Ids das pastas irmãs (mesma mãe, `null` = raiz) na ordem atual. */
  async listarIdsIrmas(dto: {
    campanhaId: number;
    organizacao: string;
    pastaMaeId: number | null;
  }): Promise<number[]> {
    const linhas = await this.executarConsulta<{ id: number }>(
      `SELECT documento_pasta.id
       FROM documento_pasta
       ${this.juncaoOrganizacao()}
       WHERE documento_pasta.campanha_id = :campanhaId
         AND tipo_documento_organizacao.codigo = :organizacao
         AND documento_pasta.documento_pasta_mae_id IS NOT DISTINCT FROM :pastaMaeId::integer
         AND documento_pasta.is_deleted = false
       ORDER BY documento_pasta.ordem ASC, documento_pasta.id ASC`,
      { campanhaId: dto.campanhaId, organizacao: dto.organizacao, pastaMaeId: dto.pastaMaeId },
    );
    return linhas.map((linha) => linha.id);
  }

  /** CTE recursiva com a pasta `:id` e todas as suas descendentes ativas. */
  private subarvoreCte(): string {
    return `WITH RECURSIVE subarvore AS (
         SELECT documento_pasta.id
         FROM documento_pasta
         WHERE documento_pasta.id = :id AND documento_pasta.is_deleted = false
         UNION
         SELECT filha.id
         FROM documento_pasta AS filha
         INNER JOIN subarvore ON filha.documento_pasta_mae_id = subarvore.id
         WHERE filha.is_deleted = false
       )`;
  }

  /** Ids da pasta e de todas as suas descendentes (a própria pasta incluída). */
  async listarIdsSubarvore(id: number): Promise<number[]> {
    const linhas = await this.executarConsulta<{ id: number }>(
      `${this.subarvoreCte()}
       SELECT id FROM subarvore`,
      { id },
    );
    return linhas.map((linha) => linha.id);
  }

  /** Nível da pasta: 1 na raiz, 2 numa filha dela e assim por diante. */
  async recuperarNivel(id: number): Promise<number> {
    const [linha] = await this.executarConsulta<{ nivel: number }>(
      `WITH RECURSIVE ancestrais AS (
         SELECT documento_pasta.id, documento_pasta.documento_pasta_mae_id, 1 AS nivel
         FROM documento_pasta
         WHERE documento_pasta.id = :id AND documento_pasta.is_deleted = false
         UNION ALL
         SELECT mae.id, mae.documento_pasta_mae_id, ancestrais.nivel + 1
         FROM documento_pasta AS mae
         INNER JOIN ancestrais ON mae.id = ancestrais.documento_pasta_mae_id
         WHERE mae.is_deleted = false
       )
       SELECT COALESCE(MAX(nivel), 0)::integer AS nivel FROM ancestrais`,
      { id },
    );
    return linha?.nivel ?? 0;
  }

  /** Altura da subárvore: 1 para uma pasta sem filhas, 2 com filhas, e assim por diante. */
  async recuperarAlturaSubarvore(id: number): Promise<number> {
    const [linha] = await this.executarConsulta<{ altura: number }>(
      `WITH RECURSIVE descendentes AS (
         SELECT documento_pasta.id, 1 AS altura
         FROM documento_pasta
         WHERE documento_pasta.id = :id AND documento_pasta.is_deleted = false
         UNION ALL
         SELECT filha.id, descendentes.altura + 1
         FROM documento_pasta AS filha
         INNER JOIN descendentes ON filha.documento_pasta_mae_id = descendentes.id
         WHERE filha.is_deleted = false
       )
       SELECT COALESCE(MAX(altura), 0)::integer AS altura FROM descendentes`,
      { id },
    );
    return linha?.altura ?? 0;
  }

  /**
   * Exclusão lógica da pasta e de toda a subárvore, com os vínculos delas — subpastas e documentos
   * voltam à raiz da mesma organização.
   */
  async removerSubarvore(dto: DocumentoPastaInternoRemoverDto): Promise<void> {
    await this.executarComando(
      `${this.subarvoreCte()}
       UPDATE documento_pasta_vinculo
       SET is_deleted = true, deleted_date = NOW()
       WHERE documento_pasta_id IN (SELECT id FROM subarvore) AND is_deleted = false`,
      { id: dto.id },
    );
    await this.executarComando(
      `${this.subarvoreCte()}
       UPDATE documento_pasta
       SET is_deleted = true, deleted_date = NOW()
       WHERE id IN (SELECT id FROM subarvore) AND is_deleted = false`,
      { id: dto.id },
    );
  }

  /** Vínculo ativo do documento numa organização, ou `null` quando está na raiz. */
  async recuperarVinculo(dto: DocumentoVinculoInternoRemoverDto): Promise<{
    id: number;
    pastaId: number;
  } | null> {
    const [vinculo] = await this.executarConsulta<{ id: number; pastaId: number }>(
      `SELECT documento_pasta_vinculo.id, documento_pasta_vinculo.documento_pasta_id AS "pastaId"
       FROM documento_pasta_vinculo
       INNER JOIN tipo_documento_organizacao
         ON tipo_documento_organizacao.id = documento_pasta_vinculo.tipo_documento_organizacao_id
        AND tipo_documento_organizacao.is_deleted = false
       WHERE documento_pasta_vinculo.documento_id = :documentoId
         AND tipo_documento_organizacao.codigo = :organizacao
         AND documento_pasta_vinculo.is_deleted = false`,
      { documentoId: dto.documentoId, organizacao: dto.organizacao },
    );
    return vinculo ?? null;
  }

  /** Ids dos documentos de uma pasta, na ordem atual. */
  async listarIdsDocumentosPasta(pastaId: number): Promise<number[]> {
    const linhas = await this.executarConsulta<{ documentoId: number }>(
      `SELECT documento_pasta_vinculo.documento_id AS "documentoId"
       FROM documento_pasta_vinculo
       WHERE documento_pasta_vinculo.documento_pasta_id = :pastaId
         AND documento_pasta_vinculo.is_deleted = false
       ORDER BY documento_pasta_vinculo.ordem ASC, documento_pasta_vinculo.id ASC`,
      { pastaId },
    );
    return linhas.map((linha) => linha.documentoId);
  }

  /** Coloca o documento na pasta/posição; sobrescreve o vínculo ativo da organização, se houver. */
  async gravarVinculo(dto: DocumentoVinculoInternoAlterarDto): Promise<void> {
    const atualizados = await this.executarComando(
      `UPDATE documento_pasta_vinculo
       SET documento_pasta_id = :pastaId, ordem = :ordem
       WHERE documento_id = :documentoId
         AND tipo_documento_organizacao_id = (
           SELECT id FROM tipo_documento_organizacao
           WHERE codigo = :organizacao AND is_deleted = false)
         AND is_deleted = false`,
      {
        documentoId: dto.documentoId,
        organizacao: dto.organizacao,
        pastaId: dto.pastaId,
        ordem: dto.ordem,
      },
    );
    if (atualizados > 0) {
      return;
    }
    await this.executarComando(
      `INSERT INTO documento_pasta_vinculo
         (documento_id, documento_pasta_id, tipo_documento_organizacao_id, ordem,
          created_date, updated_date, is_deleted)
       SELECT :documentoId, :pastaId,
              (SELECT id FROM tipo_documento_organizacao
               WHERE codigo = :organizacao AND is_deleted = false),
              :ordem, NOW(), NOW(), false`,
      {
        documentoId: dto.documentoId,
        organizacao: dto.organizacao,
        pastaId: dto.pastaId,
        ordem: dto.ordem,
      },
    );
  }

  /** Devolve o documento à raiz de uma organização. */
  async removerVinculo(dto: DocumentoVinculoInternoRemoverDto): Promise<void> {
    await this.executarComando(
      `UPDATE documento_pasta_vinculo
       SET is_deleted = true, deleted_date = NOW()
       WHERE documento_id = :documentoId
         AND tipo_documento_organizacao_id = (
           SELECT id FROM tipo_documento_organizacao
           WHERE codigo = :organizacao AND is_deleted = false)
         AND is_deleted = false`,
      { documentoId: dto.documentoId, organizacao: dto.organizacao },
    );
  }

  /** Tira o documento de todas as pastas, em qualquer organização (exclusão ou ocultação). */
  async removerVinculosDocumento(dto: DocumentoVinculosInternoRemoverDto): Promise<void> {
    await this.executarComando(
      `UPDATE documento_pasta_vinculo
       SET is_deleted = true, deleted_date = NOW()
       WHERE documento_id = :documentoId AND is_deleted = false`,
      { documentoId: dto.documentoId },
    );
  }

  /** Tira o documento só da organização dos jogadores — ao ocultá-lo, ele volta à raiz ao revelar. */
  async removerVinculoJogadores(documentoId: number): Promise<number> {
    return this.executarComando(
      `UPDATE documento_pasta_vinculo
       SET is_deleted = true, deleted_date = NOW()
       WHERE documento_id = :documentoId
         AND tipo_documento_organizacao_id = (
           SELECT id FROM tipo_documento_organizacao
           WHERE codigo = 'JOGADOR' AND is_deleted = false)
         AND is_deleted = false`,
      { documentoId },
    );
  }
}
