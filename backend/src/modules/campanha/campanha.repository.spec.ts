import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { CampanhaRepository } from './campanha.repository';

describe('CampanhaRepository', () => {
  it('conta campanhas ativas em que o usuario e mestre ativo', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ total: '1' }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const total = await repositorio.contarCampanhasComoMestre({ id: 7 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('campanha.is_deleted = false');
    expect(sql).toContain('campanha_membro.is_deleted = false');
    expect(sql).toContain('campanha_membro.usuario_id = :usuarioId');
    expect(sql).toContain('tipo_campanha_membro_papel.codigo = :papelMestre');
    expect(parametros).toEqual({
      usuarioId: 7,
      papelMestre: TipoCampanhaMembroPapelEnum.MESTRE,
    });
    expect(total).toBe(1);
  });

  it('recuperarPorId seleciona na_base com COALESCE para true', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ id: 3, nome: 'Contenção Alfa', descricao: null, codigoConvite: 'ABCD2345', naBase: true }],
    });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const campanha = await repositorio.recuperarPorId({ id: 3 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain(`COALESCE(na_base, true) AS "naBase"`);
    expect(parametros).toEqual({ id: 3 });
    expect(campanha?.naBase).toBe(true);
  });

  it('alterarEstado grava na_base e devolve id/naBase', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ id: 3, naBase: false }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarEstado({ id: 3, naBase: false });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET na_base = :naBase');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 3, naBase: false });
    expect(resultado).toEqual({ id: 3, naBase: false });
  });

  it('recuperarInventario devolve os itens com COALESCE para lista vazia', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ itens: [{ id: 'a1', nome: 'Kit Médico' }] }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const itens = await repositorio.recuperarInventario({ campanhaId: 3 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain(`COALESCE(inventario, '[]'::jsonb) AS itens`);
    expect(parametros).toEqual({ campanhaId: 3 });
    expect(itens).toEqual([{ id: 'a1', nome: 'Kit Médico' }]);
  });

  it('recuperarInventario devolve lista vazia quando a campanha não existe', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const itens = await repositorio.recuperarInventario({ campanhaId: 99 });

    expect(itens).toEqual([]);
  });

  it('alterarInventario regrava a lista inteira e devolve os itens atualizados', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ itens: [{ id: 'a1', quantidade: 2 }] }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarInventario({
      campanhaId: 3,
      itens: [{ id: 'a1', quantidade: 2 } as never],
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET inventario = :itens::jsonb');
    expect(sql).toContain('WHERE id = :campanhaId AND is_deleted = false');
    expect(parametros).toEqual({ campanhaId: 3, itens: JSON.stringify([{ id: 'a1', quantidade: 2 }]) });
    expect(resultado).toEqual({ itens: [{ id: 'a1', quantidade: 2 }] });
  });

  it('recuperarPorCodigoConviteOuEspectador resolve o papel via CASE sobre os dois códigos (m8-02)', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [{ id: 3, nome: 'Contenção Alfa', descricao: null, papel: TipoCampanhaMembroPapelEnum.ESPECTADOR }],
    });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.recuperarPorCodigoConviteOuEspectador({
      codigoConvite: 'WXYZ6789',
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('codigo_convite = :codigoConvite OR codigo_convite_espectador = :codigoConvite');
    expect(sql).toContain('AND is_deleted = false');
    expect(parametros).toEqual({
      codigoConvite: 'WXYZ6789',
      papelJogador: TipoCampanhaMembroPapelEnum.JOGADOR,
      papelEspectador: TipoCampanhaMembroPapelEnum.ESPECTADOR,
    });
    expect(resultado?.papel).toBe(TipoCampanhaMembroPapelEnum.ESPECTADOR);
  });

  it('recuperarPorCodigoConviteOuEspectador devolve null quando nenhum código bate', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.recuperarPorCodigoConviteOuEspectador({
      codigoConvite: 'INVALIDO',
    });

    expect(resultado).toBeNull();
  });

  it('alterarConviteEspectador grava o novo código sem tocar o convite de jogador (m8-02)', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ id: 3, codigoConviteEspectador: 'NOVOCODE' }] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarConviteEspectador({
      id: 3,
      codigoConviteEspectador: 'NOVOCODE',
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET codigo_convite_espectador = :codigoConviteEspectador');
    expect(sql).not.toContain('SET codigo_convite =');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 3, codigoConviteEspectador: 'NOVOCODE' });
    expect(resultado).toEqual({ id: 3, codigoConviteEspectador: 'NOVOCODE' });
  });

  it('alterarPapelMembro traduz o papel por subconsulta e só toca o vínculo ativo (m8-02)', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new CampanhaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.alterarPapelMembro({
      campanhaId: 3,
      usuarioId: 42,
      papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SELECT id FROM tipo_campanha_membro_papel WHERE codigo = :papel');
    expect(sql).toContain('WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId AND is_deleted = false');
    expect(parametros).toEqual({ campanhaId: 3, usuarioId: 42, papel: TipoCampanhaMembroPapelEnum.ESPECTADOR });
    expect(resultado).toEqual({ campanhaId: 3, usuarioId: 42, papel: TipoCampanhaMembroPapelEnum.ESPECTADOR });
  });
});
