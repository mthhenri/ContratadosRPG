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
});
