import knex from "knex";
import type { Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import configuracao from "../../../../knexfile";
import { contextoTransacao } from "../../../database/transacao.service";
import { LivroRepository } from "../livro.repository";
import { LivroVersaoRepository } from "../livro-versao.repository";
import { RegraPecaRepository } from "../regra-peca.repository";
import { converterRegrasEmPecas } from "./converter-regras-em-pecas";
import { importarLivro, type DependenciasImportacao } from "./importar-livro";
import { lerFontesDeRegras } from "./ler-fontes-regras";

/**
 * Contra o PostgreSQL local (migration 0036 aplicada): `TESTAR_POSTGRES_LIVRO=1`. A importação dos
 * dois livros reais roda numa transação sempre revertida — nada fica no banco de desenvolvimento.
 */
describe.runIf(process.env.TESTAR_POSTGRES_LIVRO === "1")("importação no PostgreSQL local", () => {
  const parametros = configuracao.connection as Knex.PgConnectionConfig;
  let conexao: Knex;
  let usuarioId: number;

  beforeAll(async () => {
    expect(["localhost", "127.0.0.1", "::1"]).toContain(parametros.host);
    conexao = knex(configuracao);
    const resultado = await conexao.raw<{ rows: { id: number }[] }>(
      "SELECT id FROM usuario WHERE is_deleted = false LIMIT 1",
    );
    usuarioId = resultado.rows[0].id;
  });

  afterAll(async () => {
    await conexao.destroy();
  });

  it("importa os dois livros sem órfã, reexecuta abortando e a cópia de trabalho reconstrói a fotografia", async () => {
    const fontes = await lerFontesDeRegras(undefined, (especificador) => import(/* @vite-ignore */ especificador));
    const transacao = await conexao.transaction();
    try {
      await contextoTransacao.run(transacao, async () => {
        const pecas = new RegraPecaRepository(conexao);
        const dependencias: DependenciasImportacao = {
          livros: new LivroRepository(conexao),
          pecas,
          versoes: new LivroVersaoRepository(conexao),
          executarEmTransacao: (operacao) => operacao(),
        };
        for (const [indice, fonte] of fontes.entries()) {
          // Código próprio do teste: nunca colide com um livro já importado no banco de dev.
          const conteudo = converterRegrasEmPecas({
            ...fonte.documento,
            id: `teste-${fonte.documento.id}` as typeof fonte.documento.id,
          });
          const dto = { conteudo, ordemDoLivro: 90 + indice, usuarioId, refazer: false };
          const resumo = await importarLivro(dependencias, dto);
          const arvore = await pecas.listarArvore({ livroId: resumo.livroId });
          const ids = new Set(arvore.map((peca) => peca.id));
          expect(arvore).toHaveLength(resumo.pecas);
          expect(arvore.filter((peca) => peca.pecaPaiId !== null && !ids.has(peca.pecaPaiId))).toEqual([]);
          expect(new Set(arvore.map((peca) => peca.identificador)).size).toBe(arvore.length);
          const ancoras = arvore.flatMap((peca) => (peca.ancora === null ? [] : [peca.ancora]));
          expect(new Set(ancoras).size).toBe(ancoras.length);

          const antes = (await pecas.listarArvore({ livroId: resumo.livroId })).length;
          await expect(importarLivro(dependencias, dto)).rejects.toThrow(/já tem/);
          expect((await pecas.listarArvore({ livroId: resumo.livroId })).length).toBe(antes);

          const versao = await new LivroVersaoRepository(conexao).recuperarVersao({ id: resumo.versaoId });
          expect(versao?.conteudo).toEqual(conteudo);
          // As linhas de regra_peca reconstroem a mesma árvore da fotografia.
          const porPai = new Map<number | null, typeof arvore>();
          for (const linha of arvore) {
            porPai.set(linha.pecaPaiId, [...(porPai.get(linha.pecaPaiId) ?? []), linha]);
          }
          const montar = (pai: number | null): unknown[] =>
            (porPai.get(pai) ?? []).map((linha) => ({
              identificador: linha.identificador,
              ancora: linha.ancora,
              tipo: linha.tipo,
              ordem: linha.ordem,
              dados: linha.dados,
              filhos: montar(linha.id),
            }));
          expect(montar(null)).toEqual(conteudo.pecas);
        }
      });
    } finally {
      await transacao.rollback();
    }
  });
});
