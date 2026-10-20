import type { Knex } from 'knex';
import { TipoDocumentoOrganizacaoEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it, vi } from 'vitest';
import { DocumentoPastaRepository } from './documento-pasta.repository';

function criar(linhas: unknown[] = []) {
  const raw = vi.fn().mockResolvedValue({ rows: linhas, rowCount: linhas.length });
  return { raw, repositorio: new DocumentoPastaRepository({ raw } as unknown as Knex) };
}

describe('DocumentoPastaRepository', () => {
  it('lista as pastas da organização pedida, só ativas, na ordem entre irmãs', async () => {
    const { raw, repositorio } = criar();

    await repositorio.listarPastas({
      campanhaId: 5,
      organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('documento_pasta.is_deleted = false');
    expect(sql).toContain('tipo_documento_organizacao.codigo = :organizacao');
    expect(sql).toContain('ORDER BY documento_pasta.ordem ASC, documento_pasta.id ASC');
    expect(parametros).toEqual({ campanhaId: 5, organizacao: 'JOGADOR' });
  });

  it('o recorte de revelados vai para o WHERE dos vínculos e ignora documento e pasta excluídos', async () => {
    const { raw, repositorio } = criar();

    await repositorio.listarVinculos({
      campanhaId: 5,
      organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      apenasRevelados: true,
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('(NOT :apenasRevelados::boolean OR documento.revelado = true)');
    expect(sql).toContain('documento.is_deleted = false');
    expect(sql).toContain('documento_pasta.is_deleted = false');
    expect(sql).toContain('documento_pasta_vinculo.is_deleted = false');
    expect(parametros).toMatchObject({ apenasRevelados: true });
  });

  it('cria com INSERT ... SELECT, sem VALUES nem DEFAULT, no fim das irmãs', async () => {
    const { raw, repositorio } = criar([{ id: 11 }]);

    await repositorio.criarPasta({
      campanhaId: 5,
      organizacao: TipoDocumentoOrganizacaoEnum.MESTRE,
      nome: 'Pistas',
      pastaMaeId: null,
    });

    const [sql] = raw.mock.calls[0] as [string];
    expect(sql).toContain('INSERT INTO documento_pasta');
    expect(sql).not.toContain('VALUES');
    expect(sql).not.toContain('DEFAULT');
    expect(sql).toContain('COALESCE(MAX(irma.ordem), 0) + 1');
    expect(sql).toContain('IS NOT DISTINCT FROM :pastaMaeId::integer');
  });

  it('exclui a subárvore com soft delete — vínculos primeiro, nunca DELETE físico', async () => {
    const { raw, repositorio } = criar();

    await repositorio.removerSubarvore({ id: 10 });

    const sqls = raw.mock.calls.map(([sql]) => sql as string);
    expect(sqls).toHaveLength(2);
    expect(sqls[0]).toContain('UPDATE documento_pasta_vinculo');
    expect(sqls[1]).toContain('UPDATE documento_pasta');
    for (const sql of sqls) {
      expect(sql).toContain('WITH RECURSIVE subarvore');
      expect(sql).toContain('is_deleted = true');
      expect(sql).not.toContain('DELETE FROM');
    }
  });

  it('limpar o vínculo dos jogadores atinge só a organização JOGADOR', async () => {
    const { raw, repositorio } = criar([{}]);

    const removidos = await repositorio.removerVinculoJogadores(70);

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("codigo = 'JOGADOR'");
    expect(parametros).toEqual({ documentoId: 70 });
    expect(removidos).toBe(1);
  });

  it('grava o vínculo atualizando o ativo e só insere quando não havia nenhum', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const repositorio = new DocumentoPastaRepository({ raw } as unknown as Knex);

    await repositorio.gravarVinculo({
      documentoId: 70,
      organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      pastaId: 10,
      ordem: 1,
    });

    expect(raw).toHaveBeenCalledTimes(2);
    expect((raw.mock.calls[0] as [string])[0]).toContain('UPDATE documento_pasta_vinculo');
    const [sqlInsert] = raw.mock.calls[1] as [string];
    expect(sqlInsert).toContain('INSERT INTO documento_pasta_vinculo');
    expect(sqlInsert).not.toContain('VALUES');
  });
});
