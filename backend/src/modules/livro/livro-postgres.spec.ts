import knex from "knex";
import type { Knex } from "knex";
import { TipoLivroVersaoSituacaoEnum, TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import configuracao from "../../../knexfile";
import { contextoTransacao } from "../../database/transacao.service";
import { LivroRepository } from "./livro.repository";
import { LivroVersaoRepository } from "./livro-versao.repository";
import { RegraPecaRepository } from "./regra-peca.repository";

/**
 * Contra o PostgreSQL local (migration 0036 aplicada): `TESTAR_POSTGRES_LIVRO=1`. Cada caso roda
 * numa transação que sempre é revertida — nada fica no banco de desenvolvimento.
 */
describe.runIf(process.env.TESTAR_POSTGRES_LIVRO === "1")("livro no PostgreSQL local", () => {
    const parametros = configuracao.connection as Knex.PgConnectionConfig;
    let conexao: Knex;
    let livros: LivroRepository;
    let pecas: RegraPecaRepository;
    let versoes: LivroVersaoRepository;
    let usuarioId: number;

    const fim = new Error("reverter");
    const emTransacao = async (corpo: () => Promise<void>): Promise<void> => {
        const transacao = await conexao.transaction();
        try {
            await contextoTransacao.run(transacao, corpo);
        } catch (erro) {
            if (erro !== fim) throw erro;
        } finally {
            await transacao.rollback();
        }
    };
    const uuid = (digito: number): string =>
        `${String(digito).repeat(8)}-${String(digito).repeat(4)}-4${String(digito).repeat(3)}-8${String(digito).repeat(3)}-${String(digito).repeat(12)}`;
    const secao = { titulo: "Capítulo", nivel: 1 as const, glifo: null };
    const paragrafo = { trechos: [] };
    const conteudo = (numero: string) => ({
        formato: 1,
        codigo: "teste",
        titulo: "Teste",
        subtitulo: "Teste",
        numero,
        pecas: [],
    });
    const peca = (livroId: number, identificador: number, extra: Record<string, unknown> = {}) => ({
        livroId,
        pecaPaiId: null,
        tipo: TipoRegraPecaEnum.PARAGRAFO,
        identificador: uuid(identificador),
        ancora: null,
        ordem: 0,
        dados: paragrafo,
        ...extra,
    });

    beforeAll(async () => {
        expect(["localhost", "127.0.0.1", "::1"]).toContain(parametros.host);
        conexao = knex(configuracao);
        livros = new LivroRepository(conexao);
        pecas = new RegraPecaRepository(conexao);
        versoes = new LivroVersaoRepository(conexao);
        const resultado = await conexao.raw<{ rows: { id: number }[] }>(
            "SELECT id FROM usuario WHERE is_deleted = false LIMIT 1",
        );
        usuarioId = resultado.rows[0].id;
    });

    afterAll(async () => {
        await conexao.destroy();
    });

    it("monta a árvore ordenada, altera com revisão e recusa a revisão defasada", () =>
        emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-arvore", titulo: "T", ordem: 99 });
            const raiz = await pecas.criarPeca(peca(livro.id, 1, { tipo: TipoRegraPecaEnum.SECAO, dados: secao, ancora: "cap" }));
            const segunda = await pecas.criarPeca(peca(livro.id, 2, { pecaPaiId: raiz!.id, ordem: 1 }));
            const primeira = await pecas.criarPeca(peca(livro.id, 3, { pecaPaiId: raiz!.id, ordem: 0 }));
            const arvore = await pecas.listarArvore({ livroId: livro.id });
            expect(arvore.map((item) => item.id)).toEqual([raiz!.id, primeira!.id, segunda!.id]);
            expect(raiz).toMatchObject({ revisao: 1, tipo: "SECAO" });

            const alterada = await pecas.alterarDados({ id: raiz!.id, dados: { ...secao, titulo: "Novo" }, revisao: 1 });
            expect(alterada).toMatchObject({ revisao: 2, dados: { titulo: "Novo" } });
            expect(await pecas.alterarDados({ id: raiz!.id, dados: secao, revisao: 1 })).toBeNull();
            expect(await pecas.alterarAncora({ id: raiz!.id, ancora: "capitulo", revisao: 1 })).toBeNull();
            expect((await pecas.alterarAncora({ id: raiz!.id, ancora: "capitulo", revisao: 2 }))!.ancora).toBe("capitulo");
            throw fim;
        }));

    it("exclui a subárvore com revisão, as âncoras antigas junto, e libera a âncora", () =>
        emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-remover", titulo: "T", ordem: 99 });
            const raiz = (await pecas.criarPeca(peca(livro.id, 1, { tipo: TipoRegraPecaEnum.SECAO, dados: secao, ancora: "cap" })))!;
            const filha = (await pecas.criarPeca(peca(livro.id, 2, { pecaPaiId: raiz.id })))!;
            const neta = (await pecas.criarPeca(peca(livro.id, 3, { pecaPaiId: filha.id })))!;
            expect(await pecas.criarAncoraAntiga({ regraPecaId: raiz.id, ancora: "antiga" })).toBe(true);
            expect(await pecas.criarAncoraAntiga({ regraPecaId: raiz.id, ancora: "antiga" })).toBe(false);
            const antigas = await pecas.listarAncorasAntigas({ livroId: livro.id });
            expect(antigas).toEqual([{ regraPecaId: raiz.id, identificador: raiz.identificador, ancora: "antiga" }]);

            expect(await pecas.removerPeca({ id: raiz.id, revisao: 9 })).toBe(0);
            expect(await pecas.removerPeca({ id: raiz.id, revisao: 1 })).toBe(3);
            expect(await pecas.recuperarPeca({ id: neta.id })).toBeNull();
            expect(await pecas.listarArvore({ livroId: livro.id })).toEqual([]);
            expect(await pecas.listarAncorasAntigas({ livroId: livro.id })).toEqual([]);

            const reaproveita = await pecas.criarPeca(peca(livro.id, 4, { tipo: TipoRegraPecaEnum.SECAO, dados: secao, ancora: "cap" }));
            expect(reaproveita!.ancora).toBe("cap");
            throw fim;
        }));

    it("não cria nem move peça para pai excluído, de outro livro ou dentro da própria subárvore", () =>
        emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-pai-a", titulo: "T", ordem: 98 });
            const outro = await livros.criarLivro({ codigo: "teste-pai-b", titulo: "T", ordem: 99 });
            const pai = (await pecas.criarPeca(peca(livro.id, 1, { tipo: TipoRegraPecaEnum.SECAO, dados: secao })))!;
            const filha = (await pecas.criarPeca(peca(livro.id, 2, { pecaPaiId: pai.id })))!;
            const estrangeira = (await pecas.criarPeca(peca(outro.id, 3)))!;

            expect(await pecas.alterarPosicao({ id: pai.id, pecaPaiId: filha.id, ordem: 0, revisao: 1 })).toBeNull();
            expect(await pecas.alterarPosicao({ id: pai.id, pecaPaiId: pai.id, ordem: 0, revisao: 1 })).toBeNull();
            expect(await pecas.alterarPosicao({ id: estrangeira.id, pecaPaiId: pai.id, ordem: 0, revisao: 1 })).toBeNull();
            expect(await pecas.criarPeca(peca(outro.id, 4, { pecaPaiId: pai.id }))).toBeNull();

            expect(await pecas.removerPeca({ id: filha.id, revisao: 1 })).toBe(1);
            expect(await pecas.criarPeca(peca(livro.id, 5, { pecaPaiId: filha.id }))).toBeNull();
            const movida = await pecas.alterarPosicao({ id: pai.id, pecaPaiId: null, ordem: 3, revisao: 1 });
            expect(movida).toMatchObject({ pecaPaiId: null, ordem: 3, revisao: 2 });
            throw fim;
        }));

    it("a mesma âncora vale em livros distintos, mas não no mesmo livro", () =>
        emTransacao(async () => {
            const primeiro = await livros.criarLivro({ codigo: "teste-ancora-a", titulo: "T", ordem: 98 });
            const segundo = await livros.criarLivro({ codigo: "teste-ancora-b", titulo: "T", ordem: 99 });
            await pecas.criarPeca(peca(primeiro.id, 1, { ancora: "x" }));
            expect(await pecas.criarPeca(peca(segundo.id, 2, { ancora: "x" }))).not.toBeNull();
            await expect(pecas.criarPeca(peca(primeiro.id, 3, { ancora: "x" }))).rejects.toThrow(
                "uix_regra_peca_livro_ancora_ativo",
            );
        }));

    it("o identificador de uma peça excluída não é reaproveitado", () =>
        emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-identificador", titulo: "T", ordem: 99 });
            const original = (await pecas.criarPeca(peca(livro.id, 1)))!;
            await pecas.removerPeca({ id: original.id, revisao: 1 });
            await expect(pecas.criarPeca(peca(livro.id, 1))).rejects.toThrow("uix_regra_peca_identificador");
        }));

    it("restaura a subárvore e as âncoras; recusa quando o pai está excluído ou a âncora foi tomada", () =>
        emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-restaurar", titulo: "T", ordem: 99 });
            const raiz = await pecas.criarPeca(peca(livro.id, 1, { tipo: TipoRegraPecaEnum.SECAO, dados: secao, ancora: "cap" }));
            const filha = await pecas.criarPeca(peca(livro.id, 2, { pecaPaiId: raiz!.id }));
            await pecas.criarAncoraAntiga({ regraPecaId: raiz!.id, ancora: "cap-velho" });

            expect(await pecas.removerPeca({ id: raiz!.id, revisao: 1 })).toBe(2);
            expect(await pecas.listarArvore({ livroId: livro.id })).toEqual([]);
            expect(await pecas.restaurarPeca({ id: filha!.id, livroId: livro.id })).toBe(0); // o pai continua excluído
            expect(await pecas.restaurarPeca({ id: raiz!.id, livroId: livro.id + 1 })).toBe(0); // outro livro
            expect(await pecas.restaurarPeca({ id: raiz!.id, livroId: livro.id })).toBe(2);
            expect((await pecas.listarArvore({ livroId: livro.id })).map((item) => item.id)).toEqual([raiz!.id, filha!.id]);
            expect((await pecas.listarAncorasAntigas({ livroId: livro.id })).map((item) => item.ancora)).toEqual(["cap-velho"]);
            expect(await pecas.restaurarPeca({ id: raiz!.id, livroId: livro.id })).toBe(0); // já ativa

            await pecas.alterarOrdem({ id: filha!.id, ordem: 7 });
            const recuperada = await pecas.recuperarPeca({ id: filha!.id });
            expect([recuperada!.ordem, recuperada!.revisao]).toEqual([7, 1]);
        }));

    it("restaurar o pai não traz de volta a filha excluída antes (mesmo na mesma transação)", () =>
        emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-restaurar-antes", titulo: "T", ordem: 99 });
            const raiz = await pecas.criarPeca(peca(livro.id, 1, { tipo: TipoRegraPecaEnum.SECAO, dados: secao }));
            const filha = await pecas.criarPeca(peca(livro.id, 2, { pecaPaiId: raiz!.id }));
            await pecas.removerPeca({ id: filha!.id, revisao: 1 });
            await pecas.removerPeca({ id: raiz!.id, revisao: 1 });
            expect(await pecas.restaurarPeca({ id: raiz!.id, livroId: livro.id })).toBe(1);
            expect((await pecas.listarArvore({ livroId: livro.id })).map((item) => item.id)).toEqual([raiz!.id]);
        }));

    it("não restaura quando outra peça ativa já usa a âncora", async () => {
        await emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-restaurar-ancora", titulo: "T", ordem: 99 });
            const raiz = await pecas.criarPeca(peca(livro.id, 1, { tipo: TipoRegraPecaEnum.SECAO, dados: secao, ancora: "cap" }));
            await pecas.removerPeca({ id: raiz!.id, revisao: 1 });
            await pecas.criarPeca(peca(livro.id, 2, { tipo: TipoRegraPecaEnum.SECAO, dados: secao, ancora: "cap" }));
            await expect(pecas.restaurarPeca({ id: raiz!.id, livroId: livro.id })).rejects.toThrow("uix_regra_peca_livro_ancora_ativo");
        });
    });

    it("recusa código de livro repetido ou fora do padrão", async () => {
        await emTransacao(async () => {
            await livros.criarLivro({ codigo: "teste-repetido", titulo: "A", ordem: 1 });
            await expect(livros.criarLivro({ codigo: "teste-repetido", titulo: "B", ordem: 2 })).rejects.toThrow(
                "uix_livro_codigo_ativo",
            );
        });
        await emTransacao(async () => {
            await expect(livros.criarLivro({ codigo: "Fora Do Padrão", titulo: "A", ordem: 1 })).rejects.toThrow(
                "chk_livro_codigo",
            );
        });
    });

    it("guarda fotografias imutáveis, com atual por situação e histórico sem conteúdo", async () => {
        await emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-versao", titulo: "T", ordem: 99 });
            const base = { livroId: livro.id, formato: 1, usuarioId, nota: null };
            const rascunho = await versoes.criarVersao({ ...base, situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "0.0.1", conteudo: conteudo("0.0.1") });
            await versoes.criarVersao({ ...base, situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA, numero: "0.0.1", conteudo: conteudo("0.0.1") });
            const recente = await versoes.criarVersao({ ...base, situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA, numero: "0.0.2", conteudo: conteudo("0.0.2") });

            const publicada = await versoes.recuperarVersaoAtual({ livroId: livro.id, situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA });
            expect(publicada!.id).toBe(recente.id);
            const atualRascunho = await versoes.recuperarVersaoAtual({ livroId: livro.id, situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO });
            expect(atualRascunho!.id).toBe(rascunho.id);
            const historico = await versoes.listarVersoes({ livroId: livro.id });
            expect(historico).toHaveLength(3);
            expect(historico[0].id).toBe(recente.id);
            expect(historico[0]).not.toHaveProperty("conteudo");
            expect(recente.publicacaoData.endsWith("Z")).toBe(true);
            throw fim;
        });
        await emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-imutavel", titulo: "T", ordem: 99 });
            const versao = await versoes.criarVersao({ livroId: livro.id, situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1", formato: 1, conteudo: conteudo("1"), usuarioId, nota: null });
            const transacao = contextoTransacao.getStore()!;
            await expect(
                transacao.raw("UPDATE livro_versao SET conteudo = '{}'::jsonb WHERE id = ?", [versao.id]),
            ).rejects.toThrow("imutável");
        });
        await emTransacao(async () => {
            const livro = await livros.criarLivro({ codigo: "teste-soft", titulo: "T", ordem: 99 });
            const versao = await versoes.criarVersao({ livroId: livro.id, situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1", formato: 1, conteudo: conteudo("1"), usuarioId, nota: null });
            const transacao = contextoTransacao.getStore()!;
            await transacao.raw("UPDATE livro_versao SET is_deleted = true, deleted_date = NOW() WHERE id = ?", [versao.id]);
            expect(await versoes.recuperarVersao({ id: versao.id })).toBeNull();
            throw fim;
        });
    });
});
