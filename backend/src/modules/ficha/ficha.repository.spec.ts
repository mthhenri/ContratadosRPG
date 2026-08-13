import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { FichaRepository } from './ficha.repository';

describe('FichaRepository', () => {
  it('alterarInventario regrava só dados e devolve a ficha atualizada', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 5,
          campanhaId: 3,
          usuarioId: 10,
          nome: 'Agente Alfa',
          cor: null,
          imagemUrl: null,
          oculta: false,
          dados: { inventario: { itens: [], amplificadores: [] } },
        },
      ],
    });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);
    const dados = { inventario: { itens: [], amplificadores: [] } } as never;

    const resultado = await repositorio.alterarInventario({ id: 5, dados });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('SET dados = :dados::jsonb');
    expect(sql).not.toContain('nome = :nome');
    expect(sql).toContain('WHERE id = :id AND is_deleted = false');
    expect(parametros).toEqual({ id: 5, dados: JSON.stringify(dados) });
    expect(resultado.id).toBe(5);
  });
});
