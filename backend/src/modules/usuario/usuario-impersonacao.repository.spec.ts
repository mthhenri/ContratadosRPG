import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { UsuarioImpersonacaoRepository } from './usuario-impersonacao.repository';

describe('UsuarioImpersonacaoRepository', () => {
  it('insere auditoria por SELECT sem material de credencial', async () => {
    const raw = vi.fn<(sql: string, parametros: Record<string, unknown>) => Promise<{ rowCount: number }>>()
      .mockResolvedValue({ rowCount: 1 });
    const repository = new UsuarioImpersonacaoRepository({ raw } as unknown as Knex);

    await repository.registrar({ adminOrigemId: 1, usuarioAlvoId: 8 });

    const chamada = raw.mock.calls[0];
    const sql = chamada[0];
    const parametros = chamada[1];
    expect(sql).toContain('INSERT INTO usuario_impersonacao');
    expect(sql).toContain('SELECT :adminOrigemId, :usuarioAlvoId, NOW()');
    expect(sql).not.toContain('VALUES');
    expect(sql).not.toMatch(/senha|token|hash/i);
    expect(parametros).toEqual({ adminOrigemId: 1, usuarioAlvoId: 8 });
  });
});
