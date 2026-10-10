import type { Knex } from "knex";
import { TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { LivroVersaoRepository } from "./livro-versao.repository";

const conteudo = {
  formato: 1,
  codigo: "sistema",
  titulo: "Sistema",
  subtitulo: "Guia do jogador",
  numero: "4.1.4",
  pecas: [],
};

describe("LivroVersaoRepository", () => {
  it("congela a fotografia com INSERT ... SELECT, situação por subconsulta e conteúdo JSONB", async () => {
    const raw = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 5 }] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] });
    const repositorio = new LivroVersaoRepository({ raw } as unknown as Knex);

    await repositorio.criarVersao({
      livroId: 1,
      situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
      numero: "4.1.4",
      formato: 1,
      conteudo,
      usuarioId: 7,
      nota: null,
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("INSERT INTO livro_versao");
    expect(sql).not.toContain("VALUES");
    expect(sql).not.toContain("DEFAULT");
    expect(sql).toContain("SELECT id FROM tipo_livro_versao_situacao");
    expect(sql).toContain(":conteudo::jsonb, clock_timestamp(), :usuarioId");
    expect(parametros["situacao"]).toBe("PUBLICADA");
    expect(parametros["conteudo"]).toBe(JSON.stringify(conteudo));
  });

  it("a versão atual é a mais recente da situação", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new LivroVersaoRepository({ raw } as unknown as Knex);

    const atual = await repositorio.recuperarVersaoAtual({
      livroId: 1,
      situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO,
    });

    const [sql, parametros] = raw.mock.calls[0] as [string, Record<string, unknown>];
    expect(sql).toContain("tipo_livro_versao_situacao.codigo = :situacao");
    expect(sql).toContain("ORDER BY livro_versao.publicacao_data DESC, livro_versao.id DESC");
    expect(sql).toContain("LIMIT 1");
    expect(sql).toContain("livro_versao.is_deleted = false");
    expect(parametros).toEqual({ livroId: 1, situacao: "RASCUNHO" });
    expect(atual).toBeNull();
  });

  it("o histórico não carrega o conteúdo e o repositório não expõe alteração", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: [] });
    const repositorio = new LivroVersaoRepository({ raw } as unknown as Knex);

    await repositorio.listarVersoes({ livroId: 1 });

    const [sql] = raw.mock.calls[0] as [string];
    expect(sql).not.toContain("conteudo");
    expect(sql).toContain("livro_versao.is_deleted = false");
    expect(Object.getOwnPropertyNames(LivroVersaoRepository.prototype).sort()).toEqual([
      "colunasDoResumo",
      "constructor",
      "criarVersao",
      "dataComoTexto",
      "juncaoSituacao",
      "listarVersoes",
      "recuperarVersao",
      "recuperarVersaoAtual",
    ]);
  });
});
