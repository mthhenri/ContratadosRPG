import type { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';
import { CenaTipoEnum } from '@contratados-rpg/shared/enums';
import { CenaRepository } from './cena.repository';

describe('CenaRepository (cena-trocar-tipo)', () => {
  it('lê só o encontro mais recente da cena, que pode ter vários', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new CenaRepository({ raw } as unknown as Knex);

    await repositorio.recuperarPorId({ id: 900 });

    const [sql] = raw.mock.calls[0] as [string];
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('encontro_da_cena.cena_id = cena.id');
    expect(sql).toContain('encontro_da_cena.is_deleted = false');
    expect(sql).toContain('ORDER BY encontro_da_cena.id DESC');
    expect(sql).toContain('LIMIT 1');
  });

  it('troca o tipo traduzindo o código para o id de tipo_cena', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const repositorio = new CenaRepository({ raw } as unknown as Knex);

    await repositorio.alterarTipo({ id: 900, tipo: CenaTipoEnum.COMBATE });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('UPDATE cena');
    expect(sql).toContain('SELECT id FROM tipo_cena');
    expect(sql).toContain('codigo = :tipo AND is_deleted = false');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 900, tipo: CenaTipoEnum.COMBATE });
  });

  it('trava a linha da cena com FOR UPDATE, filtrando excluídas', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new CenaRepository({ raw } as unknown as Knex);

    await repositorio.travarPorId({ id: 900 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('FROM cena');
    expect(sql).toContain('cena.is_deleted = false');
    expect(sql).toContain('FOR UPDATE');
    expect(parametros).toEqual({ id: 900 });
  });
});
