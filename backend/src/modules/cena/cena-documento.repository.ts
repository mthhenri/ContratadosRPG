import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  CenaDocumentoInternoCriarDto,
  CenaDocumentoFocoInternoDefinirDto,
  CenaDocumentoLinhaDto,
  CenaDocumentoOrdemInternoAlterarDto,
} from '@contratados-rpg/shared/dtos/cena';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório de `cena_documento` (m7-25) — SQL bruto only, sem lógica de negócio. Dono das
 * queries do vínculo cena↔documento; permissão, apresentar (revelar) e trava anti-vazamento são
 * arbitradas na `CenaDocumentoService`. O `titulo`/`tipo`/`revelado` de cada linha vêm de `JOIN`
 * com `documento` — este repositório nunca escreve nessa tabela, só lê.
 */
@Injectable()
export class CenaDocumentoRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'cena_documento');
  }

  private colunas(): string {
    return `cena_documento.id, cena_documento.cena_id AS "cenaId",
            cena_documento.documento_id AS "documentoId", cena_documento.ordem,
            cena_documento.em_foco AS "emFoco",
            documento.titulo, tipo_documento.codigo AS tipo, documento.revelado`;
  }

  private juncoes(): string {
    return `INNER JOIN documento
              ON documento.id = cena_documento.documento_id
             AND documento.is_deleted = false
            INNER JOIN tipo_documento
              ON tipo_documento.id = documento.tipo_documento_id
             AND tipo_documento.is_deleted = false`;
  }

  /** Anexa um documento à cena, no fim da fila. */
  async anexar(dto: CenaDocumentoInternoCriarDto): Promise<CenaDocumentoLinhaDto> {
    const [inserido] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO cena_documento (cena_id, documento_id, ordem, em_foco, created_date, updated_date, is_deleted)
       SELECT :cenaId, :documentoId, :ordem, false, NOW(), NOW(), false
       RETURNING id`,
      { cenaId: dto.cenaId, documentoId: dto.documentoId, ordem: dto.ordem },
    );
    return this.recuperarPorId({ id: inserido.id }) as Promise<CenaDocumentoLinhaDto>;
  }

  /** Recupera um vínculo por id. */
  async recuperarPorId(dto: { id: number }): Promise<CenaDocumentoLinhaDto | null> {
    const [linha] = await this.executarConsulta<CenaDocumentoLinhaDto>(
      `SELECT ${this.colunas()}
       FROM cena_documento
       ${this.juncoes()}
       WHERE cena_documento.id = :id AND cena_documento.is_deleted = false`,
      { id: dto.id },
    );
    return linha ?? null;
  }

  /** O vínculo de um documento com uma cena específica — para anexar (evita duplicar) e remover. */
  async recuperarPorCenaEDocumento(dto: {
    cenaId: number;
    documentoId: number;
  }): Promise<CenaDocumentoLinhaDto | null> {
    const [linha] = await this.executarConsulta<CenaDocumentoLinhaDto>(
      `SELECT ${this.colunas()}
       FROM cena_documento
       ${this.juncoes()}
       WHERE cena_documento.cena_id = :cenaId
         AND cena_documento.documento_id = :documentoId
         AND cena_documento.is_deleted = false`,
      { cenaId: dto.cenaId, documentoId: dto.documentoId },
    );
    return linha ?? null;
  }

  /**
   * A coluna Documentos da cena, na ordem manual. `apenasRevelados` recorta jogador/espectador —
   * o mesmo predicado do `DocumentoRepository.listarPorCampanha`.
   */
  async listarPorCena(dto: {
    cenaId: number;
    apenasRevelados: boolean;
  }): Promise<CenaDocumentoLinhaDto[]> {
    return this.executarConsulta<CenaDocumentoLinhaDto>(
      `SELECT ${this.colunas()}
       FROM cena_documento
       ${this.juncoes()}
       WHERE cena_documento.cena_id = :cenaId
         AND cena_documento.is_deleted = false
         AND (:apenasRevelados::boolean = false OR documento.revelado = true)
       ORDER BY cena_documento.ordem ASC`,
      { cenaId: dto.cenaId, apenasRevelados: dto.apenasRevelados },
    );
  }

  /** Maior `ordem` já usada na cena — a service posiciona o próximo anexo no fim da fila. */
  async recuperarMaiorOrdem(dto: { cenaId: number }): Promise<number> {
    const [linha] = await this.executarConsulta<{ maiorOrdem: number | null }>(
      `SELECT MAX(ordem) AS "maiorOrdem"
       FROM cena_documento
       WHERE cena_id = :cenaId AND is_deleted = false`,
      { cenaId: dto.cenaId },
    );
    return linha?.maiorOrdem ?? 0;
  }

  /** Grava a posição de um item na coluna Documentos. */
  async alterarOrdem(dto: CenaDocumentoOrdemInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE cena_documento SET ordem = :ordem WHERE id = :id AND is_deleted = false`,
      { id: dto.id, ordem: dto.ordem },
    );
  }

  /**
   * Executado dentro da transação da service. Serializa as trocas pela cena e libera o índice
   * único parcial antes de marcar o novo foco, independentemente da ordem física dos vínculos.
   */
  async definirFoco(dto: CenaDocumentoFocoInternoDefinirDto): Promise<void> {
    await this.executarConsulta<{ id: number }>(
      `SELECT id FROM cena WHERE id = :cenaId AND is_deleted = false FOR UPDATE`,
      { cenaId: dto.cenaId },
    );
    await this.executarComando(
      `UPDATE cena_documento SET em_foco = false
       WHERE cena_id = :cenaId AND is_deleted = false AND em_foco = true`,
      { cenaId: dto.cenaId },
    );
    await this.executarComando(
      `UPDATE cena_documento
       SET em_foco = COALESCE(cena_documento.id = :id, false)
       WHERE cena_id = :cenaId AND is_deleted = false`,
      { cenaId: dto.cenaId, id: dto.id },
    );
  }

  /** Exclusão lógica do vínculo — nunca afeta o documento em si. */
  async remover(dto: { id: number }): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
