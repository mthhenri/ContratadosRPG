import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { FichaRepository } from './ficha.repository';

describe('FichaRepository', () => {
  it('exposes a dedicated vitalidade update that does not change relational fields', async () => {
  const raw = vi.fn().mockResolvedValue({ rows: [{ id: 5 }] });
  const repositorio = new FichaRepository({ raw } as unknown as Knex);
  await repositorio.alterarVitalidade({ id: 5, estado: { vidaAtual: 12 } });

  const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
  expect(sql).toContain("SET dados = jsonb_set(dados, '{estado}'");
  expect(sql).toContain("dados -> 'estado' || :estado::jsonb");
  expect(sql).not.toContain('nome = :nome');
  expect(sql).not.toContain('cor = :cor');
  expect(sql).not.toContain('imagem_url = :imagemUrl');
  expect(sql).not.toContain('oculta = :oculta');
  expect(parametros).toEqual({ id: 5, estado: JSON.stringify({ vidaAtual: 12 }) });
  });

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
