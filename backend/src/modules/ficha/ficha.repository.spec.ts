import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';
import { FichaRepository } from './ficha.repository';

describe('FichaRepository', () => {
    it("resumo expõe Categoria do JSONB mantendo filtro de fichas ativas", async () => {
        const raw = vi.fn().mockResolvedValue({ rows: [] });
        const repositorio = new FichaRepository({ raw } as unknown as Knex);
        await repositorio.listarPorCampanha({ campanhaId: 2 });
        const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
        expect(sql).toContain("ficha.dados->>'categoria' AS categoria");
        expect(sql).toContain("jsonb_typeof(ficha.dados->'inventario') = 'array'");
        expect(sql).toContain("THEN ficha.dados->'inventario'");
        expect(sql).toContain("ELSE COALESCE(ficha.dados->'inventario'->'itens', '[]'::jsonb)");
        expect(sql).toContain("ficha.is_deleted = false");
        expect(parametros).toEqual({ campanhaId: 2 });
    });
    it("mescla somente recursos correntes e Morrendo do NPC", async () => {
        const raw = vi.fn().mockResolvedValue({ rows: [{ id: 7 }] });
        const repositorio = new FichaRepository({ raw } as unknown as Knex);
        await repositorio.alterarVitalidadeNpc({ id: 7, energiaAtual: 8, morrendo: true });
        const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
        expect(sql).toContain("WHERE id = :id AND is_deleted = false");
        expect(sql).toContain("COALESCE(dados->'energia', '{}'::jsonb) || :energia::jsonb");
        expect(sql).not.toContain("nome =");
        expect(parametros).toEqual({
            id: 7, vida: "{}", energia: '{"atual":8}', condicoes: '{"morrendo":true}',
        });
    });
  it('recuperarPorId devolve o tipo via JOIN tipo_ficha (m4-11)', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 5, campanhaId: 3, usuarioId: 10, nome: 'A Estátua',
          cor: null, imagemUrl: null, imagemFoco: null, oculta: false, tipo: 'CRIATURA', dados: {},
        },
      ],
    });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.recuperarPorId({ id: 5 });

    const [sql] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('JOIN tipo_ficha ON tipo_ficha.id = ficha.tipo_ficha_id');
    expect(sql).toContain('tipo_ficha.codigo AS tipo');
    expect(resultado?.tipo).toBe('CRIATURA');
  });

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

  it('alterarFicha grava e devolve o enquadramento do avatar (imagem_foco)', async () => {
    const foco = { x: 30, y: 70, escala: 1.5 };
    const raw = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 5,
          campanhaId: 3,
          usuarioId: 10,
          nome: 'Agente Alfa',
          cor: null,
          imagemUrl: null,
          imagemFoco: foco,
          oculta: false,
          dados: {},
        },
      ],
    });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);
    const dados = {} as never;

    const resultado = await repositorio.alterarFicha({ id: 5, nome: 'Agente Alfa', imagemFoco: foco, dados });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('imagem_foco = :imagemFoco::jsonb');
    expect(sql).toContain('imagem_foco AS "imagemFoco"');
    expect(parametros['imagemFoco']).toBe(JSON.stringify(foco));
    expect(resultado.imagemFoco).toEqual(foco);
  });

  it('calcularMediasEsquadrao agrega só fichas JOGADOR, cast a float8 pra não devolver string do numeric do AVG', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ mediaNivel: 5, mediaPrestigio: 20, quantidade: 1 }] });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);

    const resultado = await repositorio.calcularMediasEsquadrao({ campanhaId: 3 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("COALESCE(AVG((ficha.dados->>'nivel')::numeric), 0)::float8");
    expect(sql).toContain("COALESCE(AVG((ficha.dados->>'prestigio')::numeric), 0)::float8");
    expect(sql).toContain("tipo_ficha.codigo = 'JOGADOR'");
    expect(sql).toContain('ficha.campanha_id = :campanhaId AND ficha.is_deleted = false');
    expect(parametros).toEqual({ campanhaId: 3 });
    expect(resultado).toEqual({ mediaNivel: 5, mediaPrestigio: 20, quantidade: 1 });
  });

  it('alterarFicha grava null quando imagemFoco não é informado', async () => {
    const raw = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 5, campanhaId: 3, usuarioId: 10, nome: 'Agente Alfa',
          cor: null, imagemUrl: null, imagemFoco: null, oculta: false, dados: {},
        },
      ],
    });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);

    await repositorio.alterarFicha({ id: 5, nome: 'Agente Alfa', dados: {} as never });

    const [, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(parametros['imagemFoco']).toBeNull();
  });

  it('listarVisiveisParaUsuario suspende só a concessão de ficha JOGADOR oculta — posse continua (fix-ficha-oculta-concessao-e-leitura)', async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new FichaRepository({ raw } as unknown as Knex);

    await repositorio.listarVisiveisParaUsuario({ campanhaId: 3, usuarioId: 42 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain('ficha.usuario_id = :usuarioId');
    const ramoConcessao = sql.slice(sql.indexOf('OR ('), sql.indexOf('ORDER BY'));
    expect(ramoConcessao).toContain('FROM usuario_ficha_acesso');
    expect(ramoConcessao).toContain('AND NOT (COALESCE(ficha.oculta, false) AND tipo_ficha.codigo = :tipoJogador)');
    expect(parametros).toEqual({ campanhaId: 3, usuarioId: 42, tipoJogador: TipoFichaEnum.JOGADOR });
  });
});
