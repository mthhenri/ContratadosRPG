import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type { LivroPacoteItemDto } from "@contratados-rpg/shared/dtos/livro";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

@Injectable()
export class LivroPacoteRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, "livro_versao");
  }

  /** Um único statement compartilha snapshot MVCC entre as duas publicações. */
  async listarPublicacoesAtuais(): Promise<LivroPacoteItemDto[]> {
    return this.executarConsulta<LivroPacoteItemDto>(
      `SELECT livro.codigo, publicacao.conteudo->>'titulo' AS titulo, livro.ordem,
              publicacao.numero, publicacao.formato,
              to_char(publicacao.publicacao_data AT TIME ZONE 'UTC',
                      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "publicacaoData",
              publicacao.nota, publicacao.conteudo
       FROM livro
       CROSS JOIN LATERAL (
         SELECT livro_versao.numero, livro_versao.formato, livro_versao.publicacao_data,
                livro_versao.nota, livro_versao.conteudo
         FROM livro_versao
         INNER JOIN tipo_livro_versao_situacao
           ON tipo_livro_versao_situacao.id = livro_versao.tipo_livro_versao_situacao_id
          AND tipo_livro_versao_situacao.is_deleted = false
         WHERE livro_versao.livro_id = livro.id
           AND livro_versao.is_deleted = false
           AND tipo_livro_versao_situacao.codigo = :situacao
         ORDER BY livro_versao.publicacao_data DESC, livro_versao.id DESC
         LIMIT 1
       ) AS publicacao
       WHERE livro.is_deleted = false AND livro.codigo IN (:sistema, :guia)
       ORDER BY livro.ordem, livro.codigo`,
      { situacao: "PUBLICADA", sistema: "sistema", guia: "guia" },
    );
  }
}
