import type { Knex } from 'knex';
import { BuscaCampanhaFonteEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it, vi } from 'vitest';

import { PaginaCadernoRepository } from './pagina-caderno.repository';

const paginaPersistida = {
  id: 9,
  campanhaId: 3,
  usuarioAutorId: 7,
  autorNome: 'Agente Alfa',
  titulo: 'Relatório',
  conteudoMarkdown: 'Texto da contenção.',
  createdDate: '2026-08-14T12:00:00.000Z',
  updatedDate: '2026-08-14T12:00:00.000Z',
};

describe('PaginaCadernoRepository', () => {
  it('cria página com INSERT SELECT e devolve o recorte completo', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [paginaPersistida] });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.criarPagina({
      campanhaId: 3,
      usuarioAutorId: 7,
      titulo: 'Relatório',
      conteudoMarkdown: 'Texto da contenção.',
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain(`to_char(pagina_criada.updated_date AT TIME ZONE 'UTC'`);
    expect(sql).toContain(`'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`);
    expect(sql).toContain('INSERT INTO pagina_caderno');
    expect(sql).toContain('SELECT :campanhaId, :usuarioAutorId, :titulo, :conteudoMarkdown');
    expect(sql).not.toContain('VALUES');
    expect(sql).toContain("''::tsvector");
    expect(parametros).toEqual({
      campanhaId: 3,
      usuarioAutorId: 7,
      titulo: 'Relatório',
      conteudoMarkdown: 'Texto da contenção.',
    });
    expect(resultado).toEqual(paginaPersistida);
  });

  it('lista somente páginas cujo autor continua membro ativo', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ ...paginaPersistida, conteudoMarkdown: undefined, createdDate: undefined }],
    });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.listarPaginas({ campanhaId: 3, usuarioAutorId: 7 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('campanha_membro.usuario_id = pagina_caderno.usuario_autor_id');
    expect(sql).toContain('campanha_membro.is_deleted = false');
    expect(sql).toContain('pagina_caderno.is_deleted = false');
    expect(sql).toContain('campanha.is_deleted = false');
    expect(sql).toContain('usuario.is_deleted = false');
    expect(sql).toContain('ORDER BY pagina_caderno.updated_date DESC, pagina_caderno.id DESC');
    expect(parametros).toEqual({ campanhaId: 3, usuarioAutorId: 7 });
    expect(resultado).toHaveLength(1);
  });

  it('recupera página ativa por id sem expor página de ex-membro', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [paginaPersistida] });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.recuperarPagina({ id: 9 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('pagina_caderno.id = :id');
    expect(sql).toContain('campanha_membro.is_deleted = false');
    expect(sql).toContain('pagina_caderno.is_deleted = false');
    expect(parametros).toEqual({ id: 9 });
    expect(resultado).toEqual(paginaPersistida);
  });

  it('altera somente quando updatedDate ainda coincide e devolve a nova versão', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ ...paginaPersistida, updatedDate: '2026-08-14T12:05:00.000Z' }],
    });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarPagina({
      id: 9,
      titulo: 'Relatório revisado',
      conteudoMarkdown: 'Texto',
      updatedDate: '2026-08-14T12:00:00.000Z',
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('pagina_caderno.updated_date = :updatedDate::timestamptz');
    expect(sql).toContain('pagina_caderno.is_deleted = false');
    expect(parametros).toEqual({
      id: 9,
      titulo: 'Relatório revisado',
      conteudoMarkdown: 'Texto',
      updatedDate: '2026-08-14T12:00:00.000Z',
    });
    expect(resultado?.updatedDate).toBe('2026-08-14T12:05:00.000Z');
  });

  it('devolve null quando a versão otimista não coincide', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarPagina({
      id: 9,
      titulo: 'Conflito',
      conteudoMarkdown: '',
      updatedDate: '2026-08-13T12:00:00.000Z',
    });

    expect(resultado).toBeNull();
  });

  it('exclui logicamente por id', async () => {
    const raw = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    await repositorio.excluirPagina({ id: 9 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('UPDATE pagina_caderno');
    expect(sql).toContain('SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 9 });
  });

  it('combina somente os ramos autorizados e pagina com ordem estável', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            tipo: 'PAGINA_CADERNO',
            id: 9,
            titulo: 'Relatório',
            trecho: '⟦contenção⟧',
            autorNome: 'Agente Alfa',
            updatedDate: '2026-08-14T12:00:00.000Z',
            relevancia: 0.8,
          },
        ],
      });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.buscarCampanha({
      campanhaId: 3,
      usuarioAtivoId: 7,
      termo: 'contenção',
      fontes: [BuscaCampanhaFonteEnum.MEU_CADERNO, BuscaCampanhaFonteEnum.MINHAS_FICHAS],
      pagina: 2,
      limite: 20,
    });

    const [sqlContagem, parametrosContagem] = raw.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    const [sqlItens, parametrosItens] = raw.mock.calls[1] as [string, Record<string, unknown>];
    expect(sqlContagem).toContain("'PAGINA_CADERNO' AS tipo");
    expect(sqlContagem).toContain("'ANOTACAO_FICHA' AS tipo");
    expect(sqlContagem).toContain('pagina_caderno.usuario_autor_id = :usuarioAtivoId');
    expect(sqlContagem).toContain('ficha.usuario_id = :usuarioAtivoId');
    expect(sqlContagem).not.toContain('tipo_campanha_membro_papel.codigo = :papelJogador');
    expect(sqlItens).toContain('UNION ALL');
    expect(sqlItens).toContain('ORDER BY relevancia DESC, "updatedDate" DESC, id DESC');
    expect(sqlItens).toContain('LIMIT :itensPorPagina OFFSET :deslocamento');
    expect(parametrosContagem).toEqual({
      campanhaId: 3,
      usuarioAtivoId: 7,
      termo: 'contenção',
      papelJogador: 'JOGADOR',
    });
    expect(parametrosItens).toEqual({
      ...parametrosContagem,
      itensPorPagina: 20,
      deslocamento: 20,
    });
    expect(resultado.totalItens).toBe(1);
    expect(resultado.paginaAtual).toBe(2);
  });

  it('restringe o ramo de cadernos dos jogadores ao papel JOGADOR', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const repositorio = new PaginaCadernoRepository({ raw } as unknown as Knex);

    await repositorio.buscarCampanha({
      campanhaId: 3,
      usuarioAtivoId: 11,
      termo: 'laboratório',
      fontes: [BuscaCampanhaFonteEnum.CADERNOS_JOGADORES],
      pagina: 1,
      limite: 20,
    });

    const [sql] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('tipo_campanha_membro_papel.codigo = :papelJogador');
    expect(sql).toContain('pagina_caderno.busca @@ consulta.valor');
    expect(sql).not.toContain("'ANOTACAO_FICHA' AS tipo");
  });
});
