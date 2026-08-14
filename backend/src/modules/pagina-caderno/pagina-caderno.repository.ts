import { Inject, Injectable } from '@nestjs/common';
import type {
  BuscaCampanhaInternoDto,
  BuscaCampanhaResultadoDto,
  PaginaCadernoExcluirDto,
  PaginaCadernoInternoAlterarDto,
  PaginaCadernoInternoCriarDto,
  PaginaCadernoInternoListarDto,
  PaginaCadernoInternoRecuperadaDto,
  PaginaCadernoRecuperarDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import { BuscaCampanhaFonteEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';
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

  async buscarCampanha(
    dto: BuscaCampanhaInternoDto,
  ): Promise<PaginatedResult<BuscaCampanhaResultadoDto>> {
    const ramos = this.montarRamosBusca(dto.fontes);
    const consultaComum = `WITH consulta AS (
      SELECT websearch_to_tsquery(
        'public.contratados_portugues'::regconfig,
        :termo
      ) AS valor
    ), resultados AS (
      ${ramos.join('\nUNION ALL\n')}
    )`;
    const parametrosSql = {
      campanhaId: dto.campanhaId,
      usuarioAtivoId: dto.usuarioAtivoId,
      termo: dto.termo,
      papelJogador: TipoCampanhaMembroPapelEnum.JOGADOR,
    };

    return this.executarConsultaPaginada<BuscaCampanhaResultadoDto>({
      sqlSelect: `${consultaComum} SELECT * FROM resultados`,
      sqlContagem: `${consultaComum} SELECT COUNT(*) AS total FROM resultados`,
      parametrosSql,
      pagina: dto.pagina,
      itensPorPagina: dto.limite,
      ordenarPor: 'relevancia DESC, "updatedDate" DESC, id',
      direcao: 'DESC',
    });
  }

  private montarRamosBusca(fontes: readonly BuscaCampanhaFonteEnum[]): string[] {
    const ramos: string[] = [];
    if (fontes.includes(BuscaCampanhaFonteEnum.MEU_CADERNO)) {
      ramos.push(this.ramoMeuCaderno());
    }
    if (fontes.includes(BuscaCampanhaFonteEnum.CADERNOS_JOGADORES)) {
      ramos.push(this.ramoCadernosJogadores());
    }
    if (fontes.includes(BuscaCampanhaFonteEnum.MINHAS_FICHAS)) {
      ramos.push(this.ramoMinhasFichas());
    }
    if (fontes.includes(BuscaCampanhaFonteEnum.FICHAS_CAMPANHA)) {
      ramos.push(this.ramoFichasCampanha());
    }
    return ramos;
  }

  private ramoMeuCaderno(): string {
    return `${this.selecaoPagina()}
      WHERE pagina_caderno.campanha_id = :campanhaId
        AND pagina_caderno.usuario_autor_id = :usuarioAtivoId
        AND pagina_caderno.is_deleted = false
        AND pagina_caderno.busca @@ consulta.valor`;
  }

  private ramoCadernosJogadores(): string {
    return `${this.selecaoPagina(true)}
      WHERE pagina_caderno.campanha_id = :campanhaId
        AND tipo_campanha_membro_papel.codigo = :papelJogador
        AND pagina_caderno.is_deleted = false
        AND pagina_caderno.busca @@ consulta.valor`;
  }

  private selecaoPagina(incluirPapel = false): string {
    const juncaoPapel = incluirPapel
      ? `INNER JOIN tipo_campanha_membro_papel
           ON tipo_campanha_membro_papel.id = campanha_membro.tipo_campanha_membro_papel_id
          AND tipo_campanha_membro_papel.is_deleted = false`
      : '';
    return `SELECT 'PAGINA_CADERNO' AS tipo,
        pagina_caderno.id,
        pagina_caderno.titulo,
        ts_headline(
          'public.contratados_portugues'::regconfig,
          concat_ws(' ', pagina_caderno.titulo, pagina_caderno.conteudo_markdown),
          consulta.valor,
          'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12'
        ) AS trecho,
        usuario.nome AS "autorNome",
        NULL::varchar AS "fichaNome",
        pagina_caderno.updated_date AS "updatedDate",
        ts_rank(pagina_caderno.busca, consulta.valor) AS relevancia
      FROM pagina_caderno
      CROSS JOIN consulta
      ${this.juncoesAutorAtivo()}
      ${juncaoPapel}`;
  }

  private ramoMinhasFichas(): string {
    return `${this.selecaoFicha()}
      WHERE ficha.campanha_id = :campanhaId
        AND ficha.usuario_id = :usuarioAtivoId
        AND ficha.is_deleted = false
        AND NULLIF(btrim(ficha.dados->>'anotacoes'), '') IS NOT NULL
        AND ${this.vetorBuscaFicha()} @@ consulta.valor`;
  }

  private ramoFichasCampanha(): string {
    return `${this.selecaoFicha()}
      WHERE ficha.campanha_id = :campanhaId
        AND ficha.is_deleted = false
        AND NULLIF(btrim(ficha.dados->>'anotacoes'), '') IS NOT NULL
        AND ${this.vetorBuscaFicha()} @@ consulta.valor`;
  }

  private selecaoFicha(): string {
    return `SELECT 'ANOTACAO_FICHA' AS tipo,
        ficha.id,
        ficha.nome AS titulo,
        ts_headline(
          'public.contratados_portugues'::regconfig,
          COALESCE(ficha.dados->>'anotacoes', ''),
          consulta.valor,
          'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12'
        ) AS trecho,
        usuario.nome AS "autorNome",
        ficha.nome AS "fichaNome",
        ficha.updated_date AS "updatedDate",
        ts_rank(${this.vetorBuscaFicha()}, consulta.valor) AS relevancia
      FROM ficha
      CROSS JOIN consulta
      INNER JOIN campanha
        ON campanha.id = ficha.campanha_id
       AND campanha.is_deleted = false
      INNER JOIN usuario
        ON usuario.id = ficha.usuario_id
       AND usuario.is_deleted = false`;
  }

  private vetorBuscaFicha(): string {
    return `(setweight(
      to_tsvector('public.contratados_portugues'::regconfig, COALESCE(ficha.nome, '')),
      'A'
    ) || setweight(
      to_tsvector(
        'public.contratados_portugues'::regconfig,
        COALESCE(ficha.dados->>'anotacoes', '')
      ),
      'B'
    ))`;
  }
}
