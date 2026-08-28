import { Inject, Injectable } from '@nestjs/common';
import type {
  BuscaCampanhaInternoDto,
  BuscaCampanhaResultadoDto,
  PaginaCadernoExcluirDto,
  PaginaCadernoEsquadraoInternoAlterarDto,
  PaginaCadernoEsquadraoInternoCriarDto,
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
            tipo_pagina_caderno.codigo AS tipo,
            ${alias}.titulo, ${alias}.conteudo_markdown AS "conteudoMarkdown",
            ${alias}.estado_colaborativo AS "estadoColaborativo",
            ${this.dataComoTexto(alias, 'created_date')} AS "createdDate",
            ${this.dataComoTexto(alias, 'updated_date')} AS "updatedDate"`;
  }

  private dataComoTexto(alias: string, coluna: string): string {
    return `to_char(${alias}.${coluna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
  }

  private juncoesAutorAtivo(alias = 'pagina_caderno'): string {
    return `INNER JOIN campanha
              ON campanha.id = ${alias}.campanha_id
             AND campanha.is_deleted = false
            INNER JOIN usuario
              ON usuario.id = ${alias}.usuario_autor_id
             AND usuario.is_deleted = false
            INNER JOIN tipo_pagina_caderno
              ON tipo_pagina_caderno.id = ${alias}.tipo_pagina_caderno_id
             AND tipo_pagina_caderno.is_deleted = false
            INNER JOIN campanha_membro
              ON campanha_membro.campanha_id = ${alias}.campanha_id
             AND campanha_membro.usuario_id = ${alias}.usuario_autor_id
             AND campanha_membro.is_deleted = false`;
  }

  async criarPagina(dto: PaginaCadernoInternoCriarDto): Promise<PaginaCadernoInternoRecuperadaDto> {
    const [paginaCriada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `WITH pagina_criada AS (
         INSERT INTO pagina_caderno
           (campanha_id, usuario_autor_id, tipo_pagina_caderno_id, titulo, conteudo_markdown, busca,
            created_date, updated_date, is_deleted)
         SELECT :campanhaId, :usuarioAutorId,
                (SELECT id FROM tipo_pagina_caderno WHERE codigo = 'PRIVADA' AND is_deleted = false),
                :titulo, :conteudoMarkdown, ''::tsvector,
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
              pagina_caderno.titulo,
              ${this.dataComoTexto('pagina_caderno', 'updated_date')} AS "updatedDate"
       FROM pagina_caderno
       ${this.juncoesAutorAtivo()}
       WHERE pagina_caderno.campanha_id = :campanhaId
         AND pagina_caderno.usuario_autor_id = :usuarioAutorId
         AND tipo_pagina_caderno.codigo = 'PRIVADA'
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
           AND pagina_caderno.tipo_pagina_caderno_id = (
             SELECT id FROM tipo_pagina_caderno WHERE codigo = 'PRIVADA' AND is_deleted = false
           )
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

  async criarPaginaEsquadrao(
    dto: PaginaCadernoEsquadraoInternoCriarDto,
  ): Promise<PaginaCadernoInternoRecuperadaDto | null> {
    const [paginaCriada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `WITH pagina_criada AS (
         INSERT INTO pagina_caderno
           (campanha_id, usuario_autor_id, tipo_pagina_caderno_id, titulo, conteudo_markdown,
            estado_colaborativo, busca, created_date, updated_date, is_deleted)
         SELECT :campanhaId, NULL,
                (SELECT id FROM tipo_pagina_caderno WHERE codigo = 'ESQUADRAO' AND is_deleted = false),
                :titulo, :conteudoMarkdown, :estadoColaborativo, ''::tsvector, NOW(), NOW(), false
         FROM campanha
         WHERE campanha.id = :campanhaId
           AND campanha.is_deleted = false
         RETURNING *
       )
       SELECT pagina_criada.id, pagina_criada.campanha_id AS "campanhaId",
              NULL::integer AS "usuarioAutorId", NULL::varchar AS "autorNome",
              tipo_pagina_caderno.codigo AS tipo, pagina_criada.titulo,
              pagina_criada.conteudo_markdown AS "conteudoMarkdown",
              pagina_criada.estado_colaborativo AS "estadoColaborativo",
              ${this.dataComoTexto('pagina_criada', 'created_date')} AS "createdDate",
              ${this.dataComoTexto('pagina_criada', 'updated_date')} AS "updatedDate"
       FROM pagina_criada
       INNER JOIN tipo_pagina_caderno
         ON tipo_pagina_caderno.id = pagina_criada.tipo_pagina_caderno_id
        AND tipo_pagina_caderno.is_deleted = false`,
      {
        campanhaId: dto.campanhaId,
        titulo: dto.titulo,
        conteudoMarkdown: dto.conteudoMarkdown,
        estadoColaborativo: dto.estadoColaborativo,
      },
    );
    return paginaCriada ?? null;
  }

  async listarPaginasEsquadrao(campanhaId: number): Promise<PaginaCadernoResumoDto[]> {
    return this.executarConsulta<PaginaCadernoResumoDto>(
      `SELECT pagina_caderno.id, pagina_caderno.campanha_id AS "campanhaId",
              NULL::integer AS "usuarioAutorId", NULL::varchar AS "autorNome",
              tipo_pagina_caderno.codigo AS tipo, pagina_caderno.titulo,
              ${this.dataComoTexto('pagina_caderno', 'updated_date')} AS "updatedDate"
       FROM pagina_caderno
       INNER JOIN campanha
         ON campanha.id = pagina_caderno.campanha_id
        AND campanha.is_deleted = false
       INNER JOIN tipo_pagina_caderno
         ON tipo_pagina_caderno.id = pagina_caderno.tipo_pagina_caderno_id
        AND tipo_pagina_caderno.codigo = 'ESQUADRAO'
        AND tipo_pagina_caderno.is_deleted = false
       WHERE pagina_caderno.campanha_id = :campanhaId
         AND pagina_caderno.is_deleted = false
       ORDER BY pagina_caderno.updated_date DESC, pagina_caderno.id DESC`,
      { campanhaId },
    );
  }

  async recuperarPaginaEsquadrao(id: number): Promise<PaginaCadernoInternoRecuperadaDto | null> {
    const [paginaEncontrada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `SELECT pagina_caderno.id, pagina_caderno.campanha_id AS "campanhaId",
              NULL::integer AS "usuarioAutorId", NULL::varchar AS "autorNome",
              tipo_pagina_caderno.codigo AS tipo, pagina_caderno.titulo,
              pagina_caderno.conteudo_markdown AS "conteudoMarkdown",
              pagina_caderno.estado_colaborativo AS "estadoColaborativo",
              ${this.dataComoTexto('pagina_caderno', 'created_date')} AS "createdDate",
              ${this.dataComoTexto('pagina_caderno', 'updated_date')} AS "updatedDate"
       FROM pagina_caderno
       INNER JOIN campanha
         ON campanha.id = pagina_caderno.campanha_id
        AND campanha.is_deleted = false
       INNER JOIN tipo_pagina_caderno
         ON tipo_pagina_caderno.id = pagina_caderno.tipo_pagina_caderno_id
        AND tipo_pagina_caderno.codigo = 'ESQUADRAO'
        AND tipo_pagina_caderno.is_deleted = false
       WHERE pagina_caderno.id = :id
         AND pagina_caderno.is_deleted = false`,
      { id },
    );
    return paginaEncontrada ?? null;
  }

  async alterarPaginaEsquadrao(
    dto: PaginaCadernoEsquadraoInternoAlterarDto,
  ): Promise<PaginaCadernoInternoRecuperadaDto | null> {
    const [paginaAlterada] = await this.executarConsulta<PaginaCadernoInternoRecuperadaDto>(
      `WITH pagina_alterada AS (
         UPDATE pagina_caderno
         SET titulo = :titulo,
             conteudo_markdown = :conteudoMarkdown,
             estado_colaborativo = :estadoColaborativo,
             updated_date = NOW()
         WHERE pagina_caderno.id = :id
           AND pagina_caderno.is_deleted = false
           AND pagina_caderno.tipo_pagina_caderno_id = (
             SELECT id FROM tipo_pagina_caderno WHERE codigo = 'ESQUADRAO' AND is_deleted = false
           )
         RETURNING *
       )
       SELECT pagina_alterada.id, pagina_alterada.campanha_id AS "campanhaId",
              NULL::integer AS "usuarioAutorId", NULL::varchar AS "autorNome",
              tipo_pagina_caderno.codigo AS tipo, pagina_alterada.titulo,
              pagina_alterada.conteudo_markdown AS "conteudoMarkdown",
              pagina_alterada.estado_colaborativo AS "estadoColaborativo",
              ${this.dataComoTexto('pagina_alterada', 'created_date')} AS "createdDate",
              ${this.dataComoTexto('pagina_alterada', 'updated_date')} AS "updatedDate"
       FROM pagina_alterada
       INNER JOIN tipo_pagina_caderno
         ON tipo_pagina_caderno.id = pagina_alterada.tipo_pagina_caderno_id
        AND tipo_pagina_caderno.is_deleted = false`,
      {
        id: dto.id,
        titulo: dto.titulo,
        conteudoMarkdown: dto.conteudoMarkdown,
        estadoColaborativo: dto.estadoColaborativo,
      },
    );
    return paginaAlterada ?? null;
  }

  async excluirPaginaEsquadrao(dto: PaginaCadernoExcluirDto): Promise<void> {
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
    if (fontes.includes(BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO)) {
      ramos.push(this.ramoCadernoEsquadrao());
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
        AND tipo_pagina_caderno.codigo = 'PRIVADA'
        AND pagina_caderno.is_deleted = false
        AND pagina_caderno.busca @@ consulta.valor`;
  }

  private ramoCadernosJogadores(): string {
    return `${this.selecaoPagina(true)}
      WHERE pagina_caderno.campanha_id = :campanhaId
        AND tipo_campanha_membro_papel.codigo = :papelJogador
        AND tipo_pagina_caderno.codigo = 'PRIVADA'
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

  private ramoCadernoEsquadrao(): string {
    return `SELECT 'PAGINA_CADERNO' AS tipo,
        pagina_caderno.id,
        pagina_caderno.titulo,
        ts_headline(
          'public.contratados_portugues'::regconfig,
          concat_ws(' ', pagina_caderno.titulo, pagina_caderno.conteudo_markdown),
          consulta.valor,
          'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12'
        ) AS trecho,
        NULL::varchar AS "autorNome",
        NULL::varchar AS "fichaNome",
        pagina_caderno.updated_date AS "updatedDate",
        ts_rank(pagina_caderno.busca, consulta.valor) AS relevancia
      FROM pagina_caderno
      CROSS JOIN consulta
      INNER JOIN campanha
        ON campanha.id = pagina_caderno.campanha_id
       AND campanha.is_deleted = false
      INNER JOIN tipo_pagina_caderno
        ON tipo_pagina_caderno.id = pagina_caderno.tipo_pagina_caderno_id
       AND tipo_pagina_caderno.codigo = 'ESQUADRAO'
       AND tipo_pagina_caderno.is_deleted = false
      WHERE pagina_caderno.campanha_id = :campanhaId
        AND pagina_caderno.is_deleted = false
        AND pagina_caderno.busca @@ consulta.valor`;
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
