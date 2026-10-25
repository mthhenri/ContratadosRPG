import type { Knex } from "knex";
import type { TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";
import type {
  LivroPacoteItemDto,
  LivroPecaDto,
} from "@contratados-rpg/shared/dtos/livro";
import type {
  LivroRecuperacaoEstadoDto,
  LivroRecuperacaoAlvoDto,
  LivroPecaRecuperacaoLinhaDto,
  LivroAncoraRecuperacaoLinhaDto,
  LivroVersaoRecuperacaoLinhaDto,
} from "@contratados-rpg/shared/dtos/livro";
import { BaseRepository } from "../../../core/base/base.repository";

/** SQL exclusivo da ferramenta local. Recuperação preserva o estado lógico ativo. */
export class ImportacaoPacoteRepository extends BaseRepository {
  constructor(conexao: Knex) {
    super(conexao, "livro");
  }

  async recuperarAdministrador(dto: {
    usuarioId: number;
  }): Promise<{ id: number }[]> {
    return this.executarConsulta(
      `SELECT usuario.id FROM usuario
      INNER JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id AND tipo_usuario.is_deleted = false
      WHERE usuario.id = :usuarioId AND usuario.is_deleted = false AND tipo_usuario.codigo = 'ADMIN'`,
      dto,
    );
  }

  async listarTipos(): Promise<{ id: number; codigo: LivroPecaDto["tipo"] }[]> {
    return this.executarConsulta(
      "SELECT id, codigo FROM tipo_regra_peca WHERE is_deleted = false",
    );
  }

  async listarSituacoes(): Promise<{ id: number; codigo: TipoLivroVersaoSituacaoEnum }[]> {
    return this.executarConsulta(
      "SELECT id, codigo FROM tipo_livro_versao_situacao WHERE is_deleted = false",
    );
  }

  async recuperarIdentidade(): Promise<
    Pick<LivroRecuperacaoAlvoDto, "sistemaIdentificador" | "bancoOid">[]
  > {
    return this
      .executarConsulta(`SELECT (pg_control_system()).system_identifier::text AS "sistemaIdentificador", pg_database.oid::int AS "bancoOid"
      FROM pg_database WHERE datname = current_database()`);
  }

  async bloquearConjunto(): Promise<void> {
    await this.executarConsulta("SELECT pg_advisory_xact_lock(183729, 1)");
    await this.executarConsulta(
      "SELECT livro.id FROM livro WHERE livro.codigo IN ('sistema', 'guia') AND livro.is_deleted = false ORDER BY livro.codigo FOR UPDATE",
    );
  }

  async recuperarEstado(dto: {
    codigo: string;
  }): Promise<LivroRecuperacaoEstadoDto[]> {
    return this.executarConsulta(
      `SELECT :codigo::text AS codigo, to_jsonb(livro) AS livro,
      COALESCE((SELECT jsonb_agg(to_jsonb(regra_peca) ORDER BY regra_peca.id) FROM regra_peca WHERE regra_peca.livro_id = livro.id AND regra_peca.is_deleted = false), '[]'::jsonb) AS pecas,
      COALESCE((SELECT jsonb_agg(to_jsonb(regra_peca_ancora_antiga) ORDER BY regra_peca_ancora_antiga.id) FROM regra_peca_ancora_antiga WHERE regra_peca_ancora_antiga.livro_id = livro.id AND regra_peca_ancora_antiga.is_deleted = false), '[]'::jsonb) AS ancoras,
      COALESCE((SELECT jsonb_agg(to_jsonb(livro_versao) ORDER BY livro_versao.id) FROM livro_versao WHERE livro_versao.livro_id = livro.id AND livro_versao.is_deleted = false), '[]'::jsonb) AS versoes
      FROM (SELECT 1) AS origem LEFT JOIN livro ON livro.codigo = :codigo AND livro.is_deleted = false`,
      dto,
    );
  }

  async desativarAncoras(dto: { livroId: number }): Promise<number> {
    return this.executarComando(
      "UPDATE regra_peca_ancora_antiga SET is_deleted = true, deleted_date = NOW() WHERE livro_id = :livroId AND is_deleted = false",
      dto,
    );
  }
  async desativarPecas(dto: { livroId: number }): Promise<number> {
    return this.executarComando(
      "UPDATE regra_peca SET is_deleted = true, deleted_date = NOW() WHERE livro_id = :livroId AND is_deleted = false",
      dto,
    );
  }
  async desativarVersoes(dto: { livroId: number }): Promise<number> {
    return this.executarComando(
      "UPDATE livro_versao SET is_deleted = true, deleted_date = NOW() WHERE livro_id = :livroId AND is_deleted = false",
      dto,
    );
  }
  async desativarLivro(dto: { id: number }): Promise<void> {
    return this.executarSoftDelete(dto.id);
  }
  async alterarLivro(dto: {
    id: number;
    titulo: string;
    ordem: number;
  }): Promise<number> {
    return this.executarComando(
      "UPDATE livro SET titulo = :titulo, ordem = :ordem WHERE id = :id AND is_deleted = false",
      dto,
    );
  }
  async reviverLivro(dto: {
    codigo: string;
  }): Promise<{ id: number; codigo: string; titulo: string; ordem: number }[]> {
    return this.executarConsulta(
      `UPDATE livro SET is_deleted = false, deleted_date = NULL
      WHERE codigo = :codigo AND is_deleted = true RETURNING id, codigo, titulo, ordem`,
      dto,
    );
  }
  async recuperarIdentificador(dto: {
    identificador: string;
  }): Promise<{ id: number; livro_id: number }[]> {
    return this.executarConsulta(
      "SELECT id, livro_id FROM regra_peca WHERE identificador = :identificador::uuid AND is_deleted = false",
      dto,
    );
  }
  async gravarPeca(dto: {
    livroId: number;
    pecaPaiId: number | null;
    peca: LivroPecaDto;
  }): Promise<{ id: number }[]> {
    return this.executarConsulta(
      `INSERT INTO regra_peca
      (livro_id, peca_pai_id, tipo_regra_peca_id, identificador, ancora, ordem, dados, revisao, created_date, updated_date, is_deleted)
      SELECT :livroId, :pecaPaiId, (SELECT id FROM tipo_regra_peca WHERE codigo = :tipo AND is_deleted = false),
      :identificador::uuid, :ancora, :ordem, :dados::jsonb, 1, NOW(), NOW(), false
      ON CONFLICT (identificador) DO UPDATE SET peca_pai_id = EXCLUDED.peca_pai_id,
      tipo_regra_peca_id = EXCLUDED.tipo_regra_peca_id, ancora = EXCLUDED.ancora, ordem = EXCLUDED.ordem,
      dados = EXCLUDED.dados, revisao = regra_peca.revisao + 1, is_deleted = false, deleted_date = NULL
      WHERE regra_peca.livro_id = EXCLUDED.livro_id RETURNING id`,
      {
        livroId: dto.livroId,
        pecaPaiId: dto.pecaPaiId,
        identificador: dto.peca.identificador,
        tipo: dto.peca.tipo,
        ancora: dto.peca.ancora,
        ordem: dto.peca.ordem,
        dados: JSON.stringify(dto.peca.dados),
      },
    );
  }
  async gravarPublicacao(dto: {
    livroId: number;
    item: LivroPacoteItemDto;
    usuarioId: number;
  }): Promise<number> {
    return this.executarComando(
      `INSERT INTO livro_versao (livro_id, tipo_livro_versao_situacao_id, numero, formato, conteudo,
      publicacao_data, usuario_id, nota, created_date, updated_date, is_deleted)
      SELECT :livroId, (SELECT id FROM tipo_livro_versao_situacao WHERE codigo = 'PUBLICADA' AND is_deleted = false),
      :numero, :formato, :conteudo::jsonb, :publicacaoData::timestamptz, :usuarioId, :nota, NOW(), NOW(), false`,
      {
        livroId: dto.livroId,
        numero: dto.item.numero,
        formato: dto.item.formato,
        conteudo: JSON.stringify(dto.item.conteudo),
        publicacaoData: dto.item.publicacaoData,
        usuarioId: dto.usuarioId,
        nota: dto.item.nota,
      },
    );
  }
  async restaurarPeca(dto: LivroPecaRecuperacaoLinhaDto): Promise<number> {
    return this.executarComando(
      `UPDATE regra_peca SET peca_pai_id = origem.peca_pai_id,
      tipo_regra_peca_id = origem.tipo_regra_peca_id, ancora = origem.ancora, ordem = origem.ordem,
      dados = origem.dados, revisao = origem.revisao, is_deleted = origem.is_deleted, deleted_date = origem.deleted_date
      FROM jsonb_populate_record(NULL::regra_peca, :linha::jsonb) AS origem
      WHERE regra_peca.id = origem.id AND regra_peca.livro_id = origem.livro_id AND regra_peca.identificador = origem.identificador`,
      { linha: JSON.stringify(dto) },
    );
  }
  async restaurarAncora(dto: LivroAncoraRecuperacaoLinhaDto): Promise<number> {
    return this.executarComando(
      `UPDATE regra_peca_ancora_antiga SET regra_peca_id = origem.regra_peca_id,
      ancora = origem.ancora, is_deleted = origem.is_deleted, deleted_date = origem.deleted_date
      FROM jsonb_populate_record(NULL::regra_peca_ancora_antiga, :linha::jsonb) AS origem
      WHERE regra_peca_ancora_antiga.id = origem.id AND regra_peca_ancora_antiga.livro_id = origem.livro_id`,
      { linha: JSON.stringify(dto) },
    );
  }
  /** Só flags: fotografia original não é reescrita, portanto o trigger permanece ativo. */
  async restaurarVersao(dto: LivroVersaoRecuperacaoLinhaDto): Promise<number> {
    return this.executarComando(
      `UPDATE livro_versao SET is_deleted = :isDeleted, deleted_date = :deletedDate::timestamptz
      WHERE id = :id AND livro_id = :livroId
      AND (to_jsonb(livro_versao) - 'updated_date' - 'is_deleted' - 'deleted_date') =
          (:linha::jsonb - 'updated_date' - 'is_deleted' - 'deleted_date')`,
      {
        id: dto.id,
        livroId: dto.livro_id,
        isDeleted: dto.is_deleted,
        deletedDate: dto.deleted_date,
        linha: JSON.stringify(dto),
      },
    );
  }
}
