import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { UsuarioRepository } from './usuario.repository';

describe('UsuarioRepository', () => {
  it('cria usuário resolvendo o tipo ativo e inicia a versão do token em 1', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ id: 12, login: 'agente.novo', nome: 'Agente Novo' }],
    });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.criarUsuario({
      login: 'agente.novo',
      senha: '$2b$10$hashgerado',
      nome: 'Agente Novo',
      tipo: TipoUsuarioEnum.NORMAL,
    });

    expect(raw).toHaveBeenCalledOnce();
    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain(
      'INSERT INTO usuario (login, senha, nome, tipo_usuario_id, token_versao, created_date, updated_date, is_deleted)',
    );
    expect(sql).toContain('SELECT :login, :senha, :nome, tipo_usuario.id, 1, NOW(), NOW(), false');
    expect(sql).toContain('FROM tipo_usuario');
    expect(sql).toContain('WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false');
    expect(sql).not.toContain('VALUES');
    expect(parametros).toEqual({
      login: 'agente.novo',
      senha: '$2b$10$hashgerado',
      nome: 'Agente Novo',
      tipo: TipoUsuarioEnum.NORMAL,
    });
  });

  it('recupera login com tipo e versão de token da relação ativa', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.recuperarPorLogin({ login: 'agente.zero' });

    const [sql] = raw.mock.calls[0] as [string];
    expect(sql).toContain('JOIN tipo_usuario');
    expect(sql).toContain('tipo_usuario.codigo AS tipo');
    expect(sql).toContain('usuario.token_versao AS "tokenVersao"');
  });

  it('recupera sessão inclusive de conta excluída para validar revogação', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 2, isDeleted: true }],
    });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    const sessao = await repositorio.recuperarSessao({ id: 7 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('usuario.is_deleted AS "isDeleted"');
    expect(sql).not.toContain('WHERE usuario.is_deleted = false');
    expect(parametros).toEqual({ id: 7 });
    expect(sessao).toEqual({ tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 2, isDeleted: true });
  });
});
