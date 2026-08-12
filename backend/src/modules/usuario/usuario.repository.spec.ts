import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { TipoUsuarioEnum, UsuarioSituacaoEnum } from '@contratados-rpg/shared/enums';
import { UsuarioRepository } from './usuario.repository';

describe('UsuarioRepository', () => {
  it('lista usuarios com filtros combinados e apenas excluidos via paginacao padrao', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            login: 'agente.zero',
            nome: 'Agente Zero',
            tipo: TipoUsuarioEnum.ADMIN,
            tipoDescricao: 'Administrador',
            isDeleted: true,
          },
        ],
      });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.listar({
      pagina: 2,
      itensPorPagina: 10,
      ordenarPor: 'nome',
      direcao: 'ASC',
      login: 'zero',
      nome: 'Agente',
      tipo: TipoUsuarioEnum.ADMIN,
      apenasExcluidos: true,
    });

    const [sqlContagem, parametrosContagem] = raw.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    const [sqlListagem, parametrosListagem] = raw.mock.calls[1] as [
      string,
      Record<string, unknown>,
    ];
    expect(sqlContagem).toContain('usuario.is_deleted = :isDeleted');
    expect(sqlContagem).toContain('usuario.login ILIKE :login');
    expect(sqlContagem).toContain('usuario.nome ILIKE :nome');
    expect(sqlContagem).toContain('tipo_usuario.codigo = :tipo');
    expect(sqlListagem).toContain('tipo_usuario.descricao AS "tipoDescricao"');
    expect(sqlListagem).toContain('ORDER BY usuario.nome ASC LIMIT :itensPorPagina OFFSET :deslocamento');
    expect(parametrosContagem).toEqual({
      isDeleted: true,
      login: '%zero%',
      nome: '%Agente%',
      tipo: TipoUsuarioEnum.ADMIN,
    });
    expect(parametrosListagem).toEqual({
      ...parametrosContagem,
      itensPorPagina: 10,
      deslocamento: 10,
    });
    expect(resultado.totalItens).toBe(1);
  });

  it('lista somente contas ativas por padrao e suporta allRows', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.listar({
      pagina: 1,
      itensPorPagina: 20,
      ordenarPor: 'login',
      direcao: 'DESC',
      allRows: true,
    });

    const [sql, parametros] = raw.mock.calls[1] as [string, Record<string, unknown>];
    expect(sql).toContain('usuario.is_deleted = :isDeleted');
    expect(sql).toContain('ORDER BY usuario.login DESC');
    expect(sql).not.toContain('LIMIT');
    expect(parametros).toEqual({ isDeleted: false });
  });

  it('busca por nome ou login e permite listar todas as situações', async () => {
    const raw = vi.fn().mockResolvedValueOnce({ rows: [{ total: '0' }] }).mockResolvedValueOnce({ rows: [] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.listar({
      pagina: 1, itensPorPagina: 20, ordenarPor: 'nome', direcao: 'ASC',
      busca: 'ana', situacao: UsuarioSituacaoEnum.TODOS,
    });

    const [sql, parametros] = raw.mock.calls[1] as [string, Record<string, unknown>];
    expect(sql).toContain('(usuario.login ILIKE :busca OR usuario.nome ILIKE :busca)');
    expect(sql).not.toContain('WHERE usuario.is_deleted =');
    expect(parametros).toEqual({ busca: '%ana%', itensPorPagina: 20, deslocamento: 0 });
  });

  it('lista excluídos quando a situação for EXCLUIDOS', async () => {
    const raw = vi.fn().mockResolvedValueOnce({ rows: [{ total: '0' }] }).mockResolvedValueOnce({ rows: [] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);
    await repositorio.listar({ pagina: 1, itensPorPagina: 20, ordenarPor: 'nome', direcao: 'ASC', situacao: UsuarioSituacaoEnum.EXCLUIDOS });
    const [sql, parametros] = raw.mock.calls[1] as [string, Record<string, unknown>];
    expect(sql).toContain('usuario.is_deleted = :isDeleted');
    expect(parametros.isDeleted).toBe(true);
  });

  it('normaliza direção de ordenação desconhecida sem interpolar entrada na query', async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.listar({
      pagina: 1,
      itensPorPagina: 20,
      ordenarPor: 'nome',
      direcao: 'DESC; DROP TABLE usuario' as 'DESC',
    });

    const [sql] = raw.mock.calls[1] as [string];
    expect(sql).toContain('ORDER BY usuario.nome ASC');
    expect(sql).not.toContain('DROP TABLE');
  });

  it('reativa conta excluida preservando login e nome', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ id: 7, login: 'agente.zero', nome: 'Agente Zero' }],
    });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.reativar({ id: 7 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET is_deleted = false, deleted_date = NULL, updated_date = NOW()');
    expect(sql).toContain('WHERE id = :id AND is_deleted = true');
    expect(sql).toContain('RETURNING id, login, nome');
    expect(parametros).toEqual({ id: 7 });
    expect(resultado).toEqual({ id: 7, login: 'agente.zero', nome: 'Agente Zero' });
  });

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

  it('altera tipo traduzindo codigo para id e retorna a descricao', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ id: 7 }] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.alterarTipo({ id: 7, tipo: TipoUsuarioEnum.TESTER });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET tipo_usuario_id = tipo_usuario.id');
    expect(sql).toContain('FROM tipo_usuario');
    expect(sql).toContain('tipo_usuario.codigo = :tipo');
    expect(sql).toContain('usuario.is_deleted = false');
    expect(parametros).toEqual({ id: 7, tipo: TipoUsuarioEnum.TESTER });
  });

  it('incrementa a versao do token somente para usuario ativo', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    await repositorio.incrementarTokenVersao({ id: 7 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('token_versao = token_versao + 1');
    expect(sql).toContain('updated_date = NOW()');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 7 });
  });

  it('conta admins ativos excluindo opcionalmente o alvo', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ total: '2' }] });
    const repositorio = new UsuarioRepository({ raw } as unknown as Knex);

    const total = await repositorio.contarAdminsAtivos({ idExcluido: 7 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('tipo_usuario.codigo = :tipoAdmin');
    expect(sql).toContain('usuario.is_deleted = false');
    expect(sql).toContain('usuario.id <> :idExcluido');
    expect(parametros).toEqual({ tipoAdmin: TipoUsuarioEnum.ADMIN, idExcluido: 7 });
    expect(total).toBe(2);
  });
});
