import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import knex, { type Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GlossarioRepository } from "./glossario.repository";

/**
 * Banco descartável (127.0.0.1:55439, `transcricao_test`) já migrado até a 0039; nunca usa .env nem produção.
 * O teste exercita o DOWN e o UP da 0039 antes de verificar o comportamento e termina com o UP aplicado.
 */
describe.runIf(process.env.TESTAR_POSTGRES_GLOSSARIO === "1")("glossário e identidades — PostgreSQL", () => {
    let conexao: Knex;
    let repositorio: GlossarioRepository;
    let campanhaA: number;
    let campanhaB: number;
    const arquivo = resolve(__dirname, "../../database/migrations/0039 - Glossario identidades e ajuste de faixa da transcricao.sql");
    const sql = readFileSync(arquivo, "utf8");
    const up = sql.split(/^-- UP$/m)[1].split(/^-- DOWN$/m)[0];
    const down = sql.split(/^-- DOWN$/m)[1];
    const criarCampanha = async (): Promise<number> => {
        const resposta = await conexao.raw<{ rows: { id: number }[] }>(`INSERT INTO campanha
            (nome, descricao, codigo_convite, codigo_convite_espectador, na_base,
             created_date, updated_date, is_deleted)
            SELECT 'Glossário', '', :convite, :espectador, true, NOW(), NOW(), false RETURNING id`,
        { convite: randomUUID(), espectador: randomUUID() });
        return resposta.rows[0].id;
    };
    const erroDeBanco = async (acao: () => Promise<unknown>): Promise<{ code?: string }> =>
        acao().then(() => ({}), (erro: { code?: string }) => erro);

    beforeAll(async () => {
        conexao = knex({ client: "pg", connection: { host: "127.0.0.1", port: 55439,
            database: "transcricao_test", user: "postgres", password: "transcricao_local_test" } });
        await conexao.transaction(async (transacao) => { await transacao.raw(down); });
        await conexao.transaction(async (transacao) => { await transacao.raw(up); });
        repositorio = new GlossarioRepository(conexao);
        campanhaA = await criarCampanha();
        campanhaB = await criarCampanha();
    });
    afterAll(async () => { await conexao?.destroy(); });

    it("a 0039 sobe, desce e sobe de novo sem erro (feito no beforeAll) e deixa as colunas novas", async () => {
        const colunas = await conexao.raw<{ rows: { column_name: string; is_nullable: string }[] }>(
            `SELECT column_name, is_nullable FROM information_schema.columns
             WHERE (table_name = 'faixa_transcricao' AND column_name IN ('identidade_confirmada', 'silencio_inicial_milissegundos'))
                OR (table_name = 'execucao_transcricao' AND column_name = 'glossario_efetivo')
             ORDER BY column_name`);
        expect(colunas.rows).toEqual([
            { column_name: "glossario_efetivo", is_nullable: "YES" },
            { column_name: "identidade_confirmada", is_nullable: "NO" },
            { column_name: "silencio_inicial_milissegundos", is_nullable: "YES" },
        ]);
    });

    it("cria, lista em ordem determinística, altera e exclui por soft delete", async () => {
        const zeca = await repositorio.criarTermo({ campanhaId: campanhaA, termo: "Zeca", chaveTermo: "zeca" });
        const aragorn = await repositorio.criarTermo({ campanhaId: campanhaA, termo: "Aragorn", chaveTermo: "aragorn" });
        expect(zeca?.campanhaId).toBe(campanhaA);
        const lista = await repositorio.listarTermos({ campanhaId: campanhaA });
        expect(lista.map((item) => item.termo)).toEqual(["Aragorn", "Zeca"]);
        const alterado = await repositorio.alterarTermo({ id: zeca!.id, termo: "Zecão", chaveTermo: "zecão" });
        expect(alterado?.termo).toBe("Zecão");
        await repositorio.excluirTermo({ id: aragorn!.id });
        expect((await repositorio.listarTermos({ campanhaId: campanhaA })).map((item) => item.termo)).toEqual(["Zecão"]);
        expect(await repositorio.recuperarTermo({ id: aragorn!.id })).toBeNull();
        expect(await repositorio.alterarTermo({ id: aragorn!.id, termo: "X", chaveTermo: "x" })).toBeNull();
    });

    it("impõe unicidade ativa por campanha e chave, libera a chave após excluir e isola campanhas", async () => {
        const primeiro = await repositorio.criarTermo({ campanhaId: campanhaA, termo: "Unico", chaveTermo: "unico" });
        expect((await erroDeBanco(() => repositorio.criarTermo({ campanhaId: campanhaA, termo: "UNICO", chaveTermo: "unico" }))).code)
            .toBe("23505");
        const outraCampanha = await repositorio.criarTermo({ campanhaId: campanhaB, termo: "Unico", chaveTermo: "unico" });
        expect(outraCampanha?.campanhaId).toBe(campanhaB);
        await repositorio.excluirTermo({ id: primeiro!.id });
        const recriado = await repositorio.criarTermo({ campanhaId: campanhaA, termo: "Unico", chaveTermo: "unico" });
        expect(recriado?.id).not.toBe(primeiro!.id);
        expect((await repositorio.listarTermos({ campanhaId: campanhaB })).map((item) => item.termo)).toEqual(["Unico"]);
    });

    it("acento diferente é termo diferente para o banco", async () => {
        const com = await repositorio.criarTermo({ campanhaId: campanhaB, termo: "Zé", chaveTermo: "zé" });
        const sem = await repositorio.criarTermo({ campanhaId: campanhaB, termo: "Ze", chaveTermo: "ze" });
        expect([com, sem].every(Boolean)).toBe(true);
    });

    it("não grava em campanha excluída nem inexistente", async () => {
        const excluida = await criarCampanha();
        await conexao.raw("UPDATE campanha SET is_deleted = true, deleted_date = NOW() WHERE id = :id", { id: excluida });
        expect(await repositorio.criarTermo({ campanhaId: excluida, termo: "Fantasma", chaveTermo: "fantasma" })).toBeNull();
        expect(await repositorio.criarTermo({ campanhaId: 2147483000, termo: "Fantasma", chaveTermo: "fantasma" })).toBeNull();
    });

    it("as restrições do schema recusam termo vazio, longo demais e campanha inexistente", async () => {
        const inserir = (termo: string, campanhaId = campanhaA) => conexao.raw(`INSERT INTO termo_glossario_transcricao
            (campanha_id, termo, chave_termo, created_date, updated_date, is_deleted)
            SELECT :campanhaId, :termo, 'k' || :termo, NOW(), NOW(), false`, { campanhaId, termo });
        expect((await erroDeBanco(() => inserir("   "))).code).toBe("23514");
        expect((await erroDeBanco(() => inserir("a".repeat(81)))).code).toBe("22001"); // VARCHAR(80)
        expect((await erroDeBanco(() => inserir("ok", 2147483000))).code).toBe("23503");
    });

    it("identidade: unicidade ativa por chave de origem; mesma pessoa pode ter várias origens", async () => {
        const inserir = (campanhaId: number, origem: string, chave: string, participante: string) =>
            conexao.raw(`INSERT INTO identidade_transcricao
                (campanha_id, nome_origem, chave_origem, participante, created_date, updated_date, is_deleted)
                SELECT :campanhaId, :origem, :chave, :participante, NOW(), NOW(), false`,
            { campanhaId, origem, chave, participante });
        await inserir(campanhaA, "joao", "joao", "João");
        await inserir(campanhaA, "joao_2", "joao_2", "João");
        expect((await erroDeBanco(() => inserir(campanhaA, "JOAO", "joao", "Outro"))).code).toBe("23505");
        await inserir(campanhaB, "joao", "joao", "João de B");
        expect((await erroDeBanco(() => inserir(campanhaA, "x", "x", "   "))).code).toBe("23514");
    });

    it("faixa: identidade_confirmada é obrigatória e o silêncio inicial não pode ser negativo", async () => {
        const sessao = await conexao.raw<{ rows: { id: number }[] }>(`INSERT INTO sessao_transcricao
            (identificador, campanha_id, titulo, arquivada, created_date, updated_date, is_deleted)
            SELECT :identificador, :campanhaId, 'S', false, NOW(), NOW(), false RETURNING id`,
        { identificador: randomUUID(), campanhaId: campanhaA });
        const inserir = (extra: string, valores: string) => conexao.raw(`INSERT INTO faixa_transcricao
            (identificador, sessao_transcricao_id, nome_arquivo, participante, deslocamento_milissegundos
             ${extra}, created_date, updated_date, is_deleted)
            SELECT :identificador, :sessaoId, 'a.wav', 'Ana', 0 ${valores}, NOW(), NOW(), false`,
        { identificador: randomUUID(), sessaoId: sessao.rows[0].id });
        expect((await erroDeBanco(() => inserir("", ""))).code).toBe("23502");
        expect((await erroDeBanco(() => inserir(", identidade_confirmada, silencio_inicial_milissegundos", ", false, -1"))).code)
            .toBe("23514");
        expect(await erroDeBanco(() => inserir(", identidade_confirmada, silencio_inicial_milissegundos", ", true, 1200")))
            .toEqual({});
    });
});
