import type { Knex } from "knex";
import { describe, expect, it, vi } from "vitest";
import { LivroRepository } from "./livro.repository";

describe("LivroRepository", () => {
  it("lista só os livros ativos, na ordem de exibição", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new LivroRepository({ raw } as unknown as Knex);

    await repositorio.listarLivros();

    const [sql] = raw.mock.calls[0] as [string];
    expect(sql).toContain("livro.is_deleted = false");
    expect(sql).toContain("ORDER BY livro.ordem ASC, livro.id ASC");
  });

  it("recupera pelo código e devolve null quando não existe", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new LivroRepository({ raw } as unknown as Knex);

    const livro = await repositorio.recuperarLivro({ codigo: "sistema" });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("livro.codigo = :codigo AND livro.is_deleted = false");
    expect(parametros).toEqual({ codigo: "sistema" });
    expect(livro).toBeNull();
  });

  it("cria com INSERT ... SELECT", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    const repositorio = new LivroRepository({ raw } as unknown as Knex);

    await repositorio.criarLivro({ codigo: "sistema", titulo: "Sistema", ordem: 1 });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("INSERT INTO livro");
    expect(sql).not.toContain("VALUES");
    expect(parametros).toEqual({ codigo: "sistema", titulo: "Sistema", ordem: 1 });
  });
});
