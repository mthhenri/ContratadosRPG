import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type {
  LivroVersaoAtualRecuperarDto,
  LivroVersaoInternoCriarDto,
  LivroVersaoRecuperadaDto,
  LivroVersaoRecuperarDto,
  LivroVersaoResumoDto,
  LivroVersoesInternoRemoverDto,
  LivroVersoesListarDto,
} from "@contratados-rpg/shared/dtos/livro";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

/**
 * Repositório de `livro_versao` (m11-02) — SQL bruto only. A fotografia é imutável: o repositório
 * só cria e lê (o banco ainda recusa, por trigger, qualquer UPDATE de conteúdo). O rascunho atual e
 * a versão atual de cada livro são a fotografia mais recente de cada situação. `situacao` traduz
 * `codigo ↔ id` de `tipo_livro_versao_situacao` no SQL.
 */
@Injectable()
export class LivroVersaoRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, "livro_versao");
  }

  /** `timestamptz` como texto ISO em UTC, com microssegundos. */
  private dataComoTexto(coluna: string): string {
    return `to_char(${coluna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
  }

  /** `JOIN` que resolve o `codigo` da situação. */
  private juncaoSituacao(): string {
    return `INNER JOIN tipo_livro_versao_situacao
              ON tipo_livro_versao_situacao.id = livro_versao.tipo_livro_versao_situacao_id
             AND tipo_livro_versao_situacao.is_deleted = false`;
  }

  /** Colunas da fotografia sem o conteúdo. */
  private colunasDoResumo(): string {
    return `livro_versao.id, livro_versao.livro_id AS "livroId",
            tipo_livro_versao_situacao.codigo AS situacao, livro_versao.numero,
            livro_versao.formato, ${this.dataComoTexto("livro_versao.publicacao_data")}
              AS "publicacaoData",
            livro_versao.usuario_id AS "usuarioId", livro_versao.nota`;
  }

  /** Congela a fotografia do livro; `publicacao_data` é o instante real do INSERT. */
  async criarVersao(dto: LivroVersaoInternoCriarDto): Promise<LivroVersaoRecuperadaDto> {
    const [versaoInserida] = await this.executarConsulta<{ id: number }>(
      `INSERT INTO livro_versao
         (livro_id, tipo_livro_versao_situacao_id, numero, formato, conteudo, publicacao_data,
          usuario_id, nota, created_date, updated_date, is_deleted)
       SELECT :livroId,
              (SELECT id FROM tipo_livro_versao_situacao
               WHERE codigo = :situacao AND is_deleted = false),
              :numero, :formato, :conteudo::jsonb, clock_timestamp(), :usuarioId, :nota,
              NOW(), NOW(), false
       RETURNING id`,
      {
        livroId: dto.livroId,
        situacao: dto.situacao,
        numero: dto.numero,
        formato: dto.formato,
        conteudo: JSON.stringify(dto.conteudo),
        usuarioId: dto.usuarioId,
        nota: dto.nota,
      },
    );
    return this.recuperarVersao({ id: versaoInserida.id }) as Promise<LivroVersaoRecuperadaDto>;
  }

  /** Fotografia completa por id, ou `null` quando não existe/está excluída. */
  async recuperarVersao(dto: LivroVersaoRecuperarDto): Promise<LivroVersaoRecuperadaDto | null> {
    const [versaoEncontrada] = await this.executarConsulta<LivroVersaoRecuperadaDto>(
      `SELECT ${this.colunasDoResumo()}, livro_versao.conteudo
       FROM livro_versao
       ${this.juncaoSituacao()}
       WHERE livro_versao.id = :id AND livro_versao.is_deleted = false`,
      { id: dto.id },
    );
    return versaoEncontrada ?? null;
  }

  /** A fotografia mais recente do livro na situação, ou `null` quando nunca foi publicada. */
  async recuperarVersaoAtual(
    dto: LivroVersaoAtualRecuperarDto,
  ): Promise<LivroVersaoRecuperadaDto | null> {
    const [versaoEncontrada] = await this.executarConsulta<LivroVersaoRecuperadaDto>(
      `SELECT ${this.colunasDoResumo()}, livro_versao.conteudo
       FROM livro_versao
       ${this.juncaoSituacao()}
       WHERE livro_versao.livro_id = :livroId
         AND tipo_livro_versao_situacao.codigo = :situacao
         AND livro_versao.is_deleted = false
       ORDER BY livro_versao.publicacao_data DESC, livro_versao.id DESC
       LIMIT 1`,
      { livroId: dto.livroId, situacao: dto.situacao },
    );
    return versaoEncontrada ?? null;
  }

  /** Histórico do livro, da mais recente para a mais antiga, sem o conteúdo. */
  async listarVersoes(dto: LivroVersoesListarDto): Promise<LivroVersaoResumoDto[]> {
    return this.executarConsulta<LivroVersaoResumoDto>(
      `SELECT ${this.colunasDoResumo()}
       FROM livro_versao
       ${this.juncaoSituacao()}
       WHERE livro_versao.livro_id = :livroId AND livro_versao.is_deleted = false
       ORDER BY livro_versao.publicacao_data DESC, livro_versao.id DESC`,
      { livroId: dto.livroId },
    );
  }

  /** Soft delete de todas as fotografias do livro (só o `--refazer` da importação, em dev). */
  async removerVersoes(dto: LivroVersoesInternoRemoverDto): Promise<number> {
    return this.executarComando(
      `UPDATE livro_versao
       SET is_deleted = true, deleted_date = NOW()
       WHERE livro_versao.livro_id = :livroId AND livro_versao.is_deleted = false`,
      { livroId: dto.livroId },
    );
  }
}
