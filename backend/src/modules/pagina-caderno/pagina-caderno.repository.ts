import { Inject, Injectable } from '@nestjs/common';
import type {
  PaginaCadernoExcluirDto,
  PaginaCadernoInternoAlterarDto,
  PaginaCadernoInternoCriarDto,
  PaginaCadernoInternoListarDto,
  PaginaCadernoInternoRecuperadaDto,
  PaginaCadernoRecuperarDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import type { Knex } from 'knex';

import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/** Persistência SQL das páginas; permissões e validações permanecem na service. */
@Injectable()
export class PaginaCadernoRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'pagina_caderno');
  }

  private colunasPagina(alias = 'pagina_caderno'): string {
    return `${alias}.id, ${alias}.campanha_id AS "campanhaId",
            ${alias}.usuario_autor_id AS "usuarioAutorId", usuario.nome AS "autorNome",
            ${alias}.titulo, ${alias}.conteudo_markdown AS "conteudoMarkdown",
            ${alias}.created_date AS "createdDate", ${alias}.updated_date AS "updatedDate"`;
  }

  private juncoesAutorAtivo(alias = 'pagina_caderno'): string {
    return `INNER JOIN campanha
              ON campanha.id = ${alias}.campanha_id
             AND campanha.is_deleted = false
            INNER JOIN usuario
              ON usuario.id = ${alias}.usuario_autor_id
             AND usuario.is_deleted = false
            INNER JOIN campanha_membro
              ON campanha_membro.campanha_id = ${alias}.campanha_id
             AND campanha_membro.usuario_id = ${alias}.usuario_autor_id
             AND campanha_membro.is_deleted = false`;
  }

  async criarPagina(dto: PaginaCadernoInternoCriarDto): Promise<PaginaCadernoInternoRecuperadaDto> {
    const [paginaCriada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `WITH pagina_criada AS (
         INSERT INTO pagina_caderno
           (campanha_id, usuario_autor_id, titulo, conteudo_markdown, busca,
            created_date, updated_date, is_deleted)
         SELECT :campanhaId, :usuarioAutorId, :titulo, :conteudoMarkdown, ''::tsvector,
                NOW(), NOW(), false
         FROM campanha_membro
         INNER JOIN campanha
           ON campanha.id = campanha_membro.campanha_id
          AND campanha.is_deleted = false
         INNER JOIN usuario
           ON usuario.id = campanha_membro.usuario_id
          AND usuario.is_deleted = false
         WHERE campanha_membro.campanha_id = :campanhaId
           AND campanha_membro.usuario_id = :usuarioAutorId
           AND campanha_membro.is_deleted = false
         RETURNING *
       )
       SELECT ${this.colunasPagina('pagina_criada')}
       FROM pagina_criada
       ${this.juncoesAutorAtivo('pagina_criada')}`,
      {
        campanhaId: dto.campanhaId,
        usuarioAutorId: dto.usuarioAutorId,
        titulo: dto.titulo,
        conteudoMarkdown: dto.conteudoMarkdown,
      },
    );
    return paginaCriada;
  }

  async listarPaginas(dto: PaginaCadernoInternoListarDto): Promise<PaginaCadernoResumoDto[]> {
    return this.executarConsulta<PaginaCadernoResumoDto>(
      `SELECT pagina_caderno.id, pagina_caderno.campanha_id AS "campanhaId",
              pagina_caderno.usuario_autor_id AS "usuarioAutorId", usuario.nome AS "autorNome",
              pagina_caderno.titulo, pagina_caderno.updated_date AS "updatedDate"
       FROM pagina_caderno
       ${this.juncoesAutorAtivo()}
       WHERE pagina_caderno.campanha_id = :campanhaId
         AND pagina_caderno.usuario_autor_id = :usuarioAutorId
         AND pagina_caderno.is_deleted = false
       ORDER BY pagina_caderno.updated_date DESC, pagina_caderno.id DESC`,
      { campanhaId: dto.campanhaId, usuarioAutorId: dto.usuarioAutorId },
    );
  }

  async recuperarPagina(
    dto: PaginaCadernoRecuperarDto,
  ): Promise<PaginaCadernoInternoRecuperadaDto | null> {
    const [paginaEncontrada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `SELECT ${this.colunasPagina()}
       FROM pagina_caderno
       ${this.juncoesAutorAtivo()}
       WHERE pagina_caderno.id = :id
         AND pagina_caderno.is_deleted = false`,
      { id: dto.id },
    );
    return paginaEncontrada ?? null;
  }

  async alterarPagina(
    dto: PaginaCadernoInternoAlterarDto,
  ): Promise<PaginaCadernoInternoRecuperadaDto | null> {
    const [paginaAlterada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `WITH pagina_alterada AS (
         UPDATE pagina_caderno
         SET titulo = :titulo,
             conteudo_markdown = :conteudoMarkdown,
             updated_date = NOW()
         WHERE pagina_caderno.id = :id
           AND pagina_caderno.updated_date = :updatedDate::timestamptz
           AND pagina_caderno.is_deleted = false
           AND EXISTS (
             SELECT 1
             FROM campanha_membro
             INNER JOIN campanha
               ON campanha.id = campanha_membro.campanha_id
              AND campanha.is_deleted = false
             INNER JOIN usuario
               ON usuario.id = campanha_membro.usuario_id
              AND usuario.is_deleted = false
             WHERE campanha_membro.campanha_id = pagina_caderno.campanha_id
               AND campanha_membro.usuario_id = pagina_caderno.usuario_autor_id
               AND campanha_membro.is_deleted = false
           )
         RETURNING *
       )
       SELECT ${this.colunasPagina('pagina_alterada')}
       FROM pagina_alterada
       ${this.juncoesAutorAtivo('pagina_alterada')}`,
      {
        id: dto.id,
        titulo: dto.titulo,
        conteudoMarkdown: dto.conteudoMarkdown,
        updatedDate: dto.updatedDate,
      },
    );
    return paginaAlterada ?? null;
  }

  async excluirPagina(dto: PaginaCadernoExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }
}
