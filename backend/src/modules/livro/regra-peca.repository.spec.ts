import type { Knex } from "knex";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { RegraPecaRepository } from "./regra-peca.repository";

const pecaRecuperada = { id: 9, revisao: 2 };

describe("RegraPecaRepository", () => {
  it("cria com INSERT ... SELECT, revisão 1, tipo traduzido por subconsulta e dados como JSONB", async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({ rows: [pecaRecuperada] });
    const repositorio = new RegraPecaRepository({ raw } as unknown as Knex);

    await repositorio.criarPeca({
      livroId: 1,
      pecaPaiId: null,
      tipo: TipoRegraPecaEnum.SECAO,
      identificador: "11111111-1111-4111-8111-111111111111",
      ancora: "combate",
      ordem: 0,
      dados: { titulo: "Combate", nivel: 1, glifo: null },
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("INSERT INTO regra_peca");
    expect(sql).not.toContain("VALUES");
    expect(sql).not.toContain("DEFAULT");
    expect(sql).toContain("SELECT id FROM tipo_regra_peca WHERE codigo = :tipo");
    expect(sql).toContain(":dados::jsonb, 1,");
    expect(parametros["tipo"]).toBe("SECAO");
    expect(parametros["dados"]).toBe('{"titulo":"Combate","nivel":1,"glifo":null}');
  });

  it("toda leitura filtra is_deleted e a árvore sai por pai e ordem", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new RegraPecaRepository({ raw } as unknown as Knex);

    await repositorio.listarArvore({ livroId: 3 });
    await repositorio.recuperarPeca({ id: 9 });
    await repositorio.recuperarPecaPorIdentificador({
      identificador: "11111111-1111-4111-8111-111111111111",
    });

    for (const [sql] of raw.mock.calls as [string][]) {
      expect(sql).toContain("regra_peca.is_deleted = false");
      expect(sql).toContain("tipo_regra_peca.is_deleted = false");
    }
    const [sqlArvore, parametrosArvore] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sqlArvore).toContain(
      "ORDER BY regra_peca.peca_pai_id ASC NULLS FIRST, regra_peca.ordem ASC",
    );
    expect(parametrosArvore).toEqual({ livroId: 3 });
  });

  it.each([
    ["alterarDados", (repositorio: RegraPecaRepository) =>
      repositorio.alterarDados({ id: 9, dados: { trechos: [] }, revisao: 2 })],
    ["alterarAncora", (repositorio: RegraPecaRepository) =>
      repositorio.alterarAncora({ id: 9, ancora: "nova", revisao: 2 })],
    ["alterarPosicao", (repositorio: RegraPecaRepository) =>
      repositorio.alterarPosicao({ id: 9, pecaPaiId: 4, ordem: 1, revisao: 2 })],
  ])("%s só aplica com a revisão do banco, incrementa e devolve null se defasada", async (_nome, alterar) => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new RegraPecaRepository({ raw } as unknown as Knex);

    const resultado = await alterar(repositorio);

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("revisao = regra_peca.revisao + 1");
    expect(sql).toContain("regra_peca.revisao = :revisao");
    expect(sql).toContain("regra_peca.is_deleted = false");
    expect(parametros["revisao"]).toBe(2);
    expect(resultado).toBeNull();
    expect(raw).toHaveBeenCalledTimes(1);
  });

  it("remover exclui a peça, as descendentes e as âncoras antigas numa só instrução", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ total: 3 }] });
    const repositorio = new RegraPecaRepository({ raw } as unknown as Knex);

    const removidas = await repositorio.removerPeca({ id: 9, revisao: 4 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("WITH RECURSIVE descendentes");
    expect(sql).toContain("UPDATE regra_peca\n         SET is_deleted = true, deleted_date = NOW()");
    expect(sql).toContain("UPDATE regra_peca_ancora_antiga");
    expect(sql).not.toContain("DELETE");
    expect(parametros).toEqual({ id: 9, revisao: 4 });
    expect(sql).toContain("regra_peca.revisao = :revisao");
    expect(removidas).toBe(3);
  });

  it("registra e lista as âncoras antigas do livro", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new RegraPecaRepository({ raw } as unknown as Knex);

    await repositorio.criarAncoraAntiga({ regraPecaId: 9, ancora: "antiga" });
    await repositorio.listarAncorasAntigas({ livroId: 1 });

    const [sqlCriar] = raw.mock.calls[0] as [string];
    expect(sqlCriar).toContain("INSERT INTO regra_peca_ancora_antiga");
    expect(sqlCriar).not.toContain("VALUES");
    expect(sqlCriar).toContain("ON CONFLICT (livro_id, ancora) WHERE is_deleted = false DO NOTHING");
    expect(sqlCriar).toContain("RETURNING id");
    const [sqlListar] = raw.mock.calls[1] as [string];
    expect(sqlListar).toContain("regra_peca_ancora_antiga.is_deleted = false");
    expect(sqlListar).toContain("regra_peca.is_deleted = false");
  });
});
