import type { Knex } from 'knex';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it, vi } from 'vitest';
import { DocumentoRepository } from './documento.repository';

describe('DocumentoRepository', () => {
  it('cria com INSERT ... SELECT, oculto e no fim da biblioteca, sem informar a busca', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 70 }] })
      .mockResolvedValueOnce({ rows: [{ id: 70 }] });
    const repositorio = new DocumentoRepository({ raw } as unknown as Knex);

    await repositorio.criarDocumento({
      campanhaId: 5,
      titulo: 'Carta',
      tipo: TipoDocumentoEnum.TEXTO,
      conteudoMarkdown: 'x',
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('INSERT INTO documento');
    expect(sql).not.toContain('VALUES');
    expect(sql).not.toContain('DEFAULT');
    expect(sql).not.toContain('busca');
    expect(sql).toContain(':titulo, :conteudoMarkdown, NULL, false');
    expect(sql).toContain('COALESCE(MAX(documento_ordem.ordem), 0) + 1');
    expect(sql).toContain('documento_ordem.is_deleted = false');
    expect(parametros).toEqual({ campanhaId: 5, tipo: 'TEXTO', titulo: 'Carta', conteudoMarkdown: 'x' });
  });

  it('o recorte de quem não é mestre vai para o WHERE, na ordem manual', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new DocumentoRepository({ raw } as unknown as Knex);

    await repositorio.listarPorCampanha({ campanhaId: 5, apenasRevelados: true });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('(NOT :apenasRevelados::boolean OR documento.revelado = true)');
    expect(sql).toContain('documento.is_deleted = false');
    expect(sql).toContain('ORDER BY documento.ordem ASC, documento.id ASC');
    expect(sql).not.toContain('conteudo_markdown');
    expect(parametros).toEqual({ campanhaId: 5, apenasRevelados: true });
  });

  it('a alteração só grava a versão que o cliente editou e devolve null quando defasada', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new DocumentoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarDocumento({
      id: 70,
      titulo: 'Carta',
      conteudoMarkdown: 'x',
      updatedDate: '2026-09-26T12:00:00.000000Z',
    });

    const [sql] = raw.mock.calls[0] as [string];
    expect(sql).toContain('documento.updated_date = :updatedDate::timestamptz');
    expect(sql).toContain('documento.is_deleted = false');
    expect(resultado).toBeNull();
    expect(raw).toHaveBeenCalledTimes(1);
  });

  it('a busca aplica o recorte no mesmo WHERE da contagem e pagina pela relevância', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const repositorio = new DocumentoRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.buscarDocumentos({
      campanhaId: 5,
      termo: 'carta',
      apenasRevelados: true,
      pagina: 2,
      limite: 10,
    });

    type Chamada = [string, Record<string, unknown>];
    const [sqlContagem, parametrosContagem] = raw.mock.calls[0] as Chamada;
    const [sqlSelecao, parametrosSelecao] = raw.mock.calls[1] as Chamada;
    for (const sql of [sqlContagem, sqlSelecao]) {
      expect(sql).toContain("'public.contratados_portugues'::regconfig");
      expect(sql).toContain('(NOT :apenasRevelados::boolean OR documento.revelado = true)');
      expect(sql).toContain('documento.busca @@ consulta.valor');
      expect(sql).toContain('documento.is_deleted = false');
    }
    expect(sqlContagem).toContain('SELECT COUNT(*) AS total FROM resultados');
    expect(sqlSelecao).toContain("'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12'");
    expect(sqlSelecao).toContain('ORDER BY relevancia DESC, "updatedDate" DESC, id DESC');
    expect(parametrosContagem).toEqual({ campanhaId: 5, termo: 'carta', apenasRevelados: true });
    expect(parametrosSelecao).toEqual({
      campanhaId: 5,
      termo: 'carta',
      apenasRevelados: true,
      itensPorPagina: 10,
      deslocamento: 10,
    });
    expect(resultado).toMatchObject({ totalItens: 1, paginaAtual: 2, totalPaginas: 1 });
  });
});
