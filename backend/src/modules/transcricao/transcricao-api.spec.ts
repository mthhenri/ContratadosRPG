import type { OpenAPIObject } from "@nestjs/swagger";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import type { CampanhaCriadaDto } from "@contratados-rpg/shared/dtos/campanha";
import type { SessaoTranscricaoCriadaDto, SessaoTranscricaoAlteradaDto, FaixaTranscricaoCriadaDto, SessaoTranscricaoResumoDto } from "@contratados-rpg/shared/dtos/transcricao";
import type { TermoGlossarioTranscricaoCriadoDto, TermoGlossarioTranscricaoResumoDto } from "@contratados-rpg/shared/dtos/transcricao";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import knex, { type Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** REST real: subir backend compilado só com DB descartável, porta fixa 53101 e segredo de teste. */
describe.runIf(process.env.TESTAR_API_TRANSCRICAO === "1")("Transcrição REST + guards + PostgreSQL", () => {
    const origem = "http://127.0.0.1:53101";
    const jwt = new JwtService({ secret: "transcricao_segredo_somente_teste_local" });
    const tokens: Record<string, string> = {};
    const ids: Record<string, number> = {};
    let conexao: Knex;
    let campanhaId: number;
    let outraCampanhaId: number;
    let sessaoId: number;
    let faixaId: number;
    let termoId: number;
    const consultar = async <TDados = unknown>(caminho: string, ator: string | null, metodo = "GET", corpo?: unknown) => {
        const resposta = await fetch(`${origem}${caminho}`, { method: metodo,
            headers: { "Content-Type": "application/json", ...(ator ? { Authorization: `Bearer ${tokens[ator]}` } : {}) },
            body: corpo === undefined ? undefined : JSON.stringify(corpo) });
        return { status: resposta.status, corpo: await resposta.json() as StandardResponse<TDados> };
    };
    beforeAll(async () => {
        conexao = knex({ client: "pg", connection: { host: "127.0.0.1", port: 55439,
            database: "transcricao_test", user: "postgres", password: "transcricao_local_test" } });
        expect((await consultar("/health", null)).status).toBe(200);
        for (const [ator, tipo] of [["mestre", "NORMAL"], ["jogador", "NORMAL"], ["espectador", "NORMAL"],
            ["alheio", "NORMAL"], ["admin", "ADMIN"], ["tester", "TESTER"]]) {
            const login = `transcricao-${randomUUID()}`;
            const criado = await conexao.raw<{ rows: { id: number }[] }>(`INSERT INTO usuario
                (login, senha, nome, tipo_usuario_id, token_versao, created_date, updated_date, is_deleted)
                SELECT :login, 'hash-teste-sem-login', :ator, tipo_usuario.id, 1, NOW(), NOW(), false
                FROM tipo_usuario WHERE codigo = :tipo AND is_deleted = false RETURNING id`, { login, ator, tipo });
            ids[ator] = criado.rows[0].id;
            tokens[ator] = jwt.sign({ sub: ids[ator], login, tipo, tokenVersao: 1 }, { expiresIn: "1h" });
        }
        const campanha = await consultar<CampanhaCriadaDto>("/campanha", "mestre", "POST", { nome: "Teste transcrição", descricao: "" });
        expect(campanha.status).toBe(201);
        campanhaId = campanha.corpo.dados!.id;
        const outra = await consultar<CampanhaCriadaDto>("/campanha", "alheio", "POST", { nome: "Outra", descricao: "" });
        outraCampanhaId = outra.corpo.dados!.id;
        for (const ator of ["jogador", "espectador", "admin", "tester"]) {
            await conexao.raw(`INSERT INTO campanha_membro
                (campanha_id, usuario_id, tipo_campanha_membro_papel_id, created_date, updated_date, is_deleted)
                SELECT :campanhaId, :usuarioId, tipo_campanha_membro_papel.id, NOW(), NOW(), false
                FROM tipo_campanha_membro_papel WHERE codigo = :papel AND is_deleted = false`,
            { campanhaId, usuarioId: ids[ator], papel: ator === "espectador" ? "ESPECTADOR" : "JOGADOR" });
        }
    });
    afterAll(async () => {
        // O banco pertence ao container descartável da task; nenhuma produção ou .env é usado.
        if (conexao) await conexao.destroy();
    });
    it("cria sessão e faixa com Unicode, precisão e retorno sem mídia", async () => {
        const resposta = await consultar<SessaoTranscricaoCriadaDto>("/transcricao/sessao", "mestre", "POST", { campanhaId, titulo: " Sessão Árvore " });
        expect(resposta.status).toBe(201);
        expect(resposta.corpo.dados!.titulo).toBe("Sessão Árvore");
        sessaoId = resposta.corpo.dados!.id;
        const faixa = await consultar<FaixaTranscricaoCriadaDto>(`/transcricao/sessao/${sessaoId}/faixa`, "mestre", "POST",
            { nomeArquivo: "Ana-Á.wav", participante: "Ana", deslocamentoMilissegundos: -2000 });
        expect(faixa.status).toBe(201);
        faixaId = faixa.corpo.dados!.id;
        expect(faixa.corpo.dados).toMatchObject({ sessaoId, deslocamentoMilissegundos: -2000 });
        expect(faixa.corpo.dados).not.toHaveProperty("caminhoLocal");
        expect(faixa.corpo.dados).not.toHaveProperty("wav");
    });
    it.each(["jogador", "espectador", "admin", "tester", "alheio"])("nega %s em leituras e escritas", async (ator) => {
        for (const caminho of [`/transcricao/sessao/${sessaoId}`, `/transcricao/faixa/${faixaId}`,
            `/transcricao/sessao?campanhaId=${campanhaId}`, `/transcricao/sessao/${sessaoId}/faixa`]) {
            expect((await consultar(caminho, ator)).status).toBe(404);
        }
        expect((await consultar(`/transcricao/sessao/${sessaoId}`, ator, "PUT", { titulo: "Ataque" })).status).toBe(404);
        expect((await consultar(`/transcricao/sessao/${sessaoId}`, ator, "DELETE")).status).toBe(404);
        const ausente = await consultar("/transcricao/sessao/2147483647", ator);
        const restrita = await consultar(`/transcricao/sessao/${sessaoId}`, ator);
        expect(restrita.corpo).toEqual(ausente.corpo);
    });
    it("OpenAPI servido anuncia criação 201 e erros privados sem alterar rotas antigas", async () => {
        const resposta = await fetch(`${origem}/api/docs-json`);
        const documento = await resposta.json() as OpenAPIObject;
        expect(resposta.status).toBe(200);
        expect(documento.paths["/transcricao/sessao"].post?.responses["201"]).toBeDefined();
        expect(documento.paths["/transcricao/sessao"].get?.responses["400"]).toBeDefined();
        expect(documento.paths["/transcricao/sessao"].get?.responses["404"]).toBeDefined();
        expect(documento.paths["/transcricao/sessao"].get?.responses["403"]).toBeUndefined();
        expect(documento.paths["/campanha"].get?.responses["200"]).toBeDefined();
    });
    it("glossário: Mestre cria, lista e recebe 409 em duplicata de caixa e dica em acento diferente", async () => {
        const criado = await consultar<TermoGlossarioTranscricaoCriadoDto>("/transcricao/glossario", "mestre", "POST",
            { campanhaId, termo: "  Zé  " });
        expect(criado.status).toBe(201);
        expect(criado.corpo.dados).toMatchObject({ campanhaId, termo: "Zé", parecidoCom: null });
        termoId = criado.corpo.dados!.id;
        const duplicado = await consultar("/transcricao/glossario", "mestre", "POST", { campanhaId, termo: "ZÉ" });
        expect(duplicado.status).toBe(409);
        const parecido = await consultar<TermoGlossarioTranscricaoCriadoDto>("/transcricao/glossario", "mestre", "POST",
            { campanhaId, termo: "Ze" });
        expect(parecido.status).toBe(201);
        expect(parecido.corpo.dados!.parecidoCom).toBe("Zé");
        const lista = await consultar<TermoGlossarioTranscricaoResumoDto[]>(`/transcricao/glossario?campanhaId=${campanhaId}`, "mestre");
        expect(lista.corpo.dados!.map((termo) => termo.termo)).toEqual(["Ze", "Zé"]);
    });
    it("glossário: corpo inválido é 400 e não grava", async () => {
        for (const corpo of [{ campanhaId, termo: "   " }, { campanhaId, termo: "a".repeat(81) }, { campanhaId, termo: "x", extra: 1 },
            { campanhaId, termo: "quebra\nde linha" }]) {
            expect((await consultar("/transcricao/glossario", "mestre", "POST", corpo)).status).toBe(400);
        }
    });
    it.each(["jogador", "espectador", "admin", "tester", "alheio"])("glossário: nega %s em leitura e escrita da campanha A", async (ator) => {
        expect((await consultar(`/transcricao/glossario?campanhaId=${campanhaId}`, ator)).status).toBe(404);
        expect((await consultar("/transcricao/glossario", ator, "POST", { campanhaId, termo: "Invasor" })).status).toBe(404);
        expect((await consultar(`/transcricao/glossario/${termoId}`, ator, "PUT", { termo: "Invadido" })).status).toBe(404);
        expect((await consultar(`/transcricao/glossario/${termoId}`, ator, "DELETE")).status).toBe(404);
    });
    it("glossário: visitante sem token recebe 401", async () => {
        expect((await consultar(`/transcricao/glossario?campanhaId=${campanhaId}`, null)).status).toBe(401);
    });
    it("glossário: o Mestre de outra campanha tem o próprio glossário isolado", async () => {
        const proprio = await consultar<TermoGlossarioTranscricaoCriadoDto>("/transcricao/glossario", "alheio", "POST",
            { campanhaId: outraCampanhaId, termo: "Zé" });
        expect(proprio.status).toBe(201);
        const lista = await consultar<TermoGlossarioTranscricaoResumoDto[]>(`/transcricao/glossario?campanhaId=${outraCampanhaId}`, "alheio");
        expect(lista.corpo.dados!.map((termo) => termo.termo)).toEqual(["Zé"]);
        const aindaIntacto = await consultar<TermoGlossarioTranscricaoResumoDto[]>(`/transcricao/glossario?campanhaId=${campanhaId}`, "mestre");
        expect(aindaIntacto.corpo.dados!.map((termo) => termo.termo)).toEqual(["Ze", "Zé"]);
    });
    it("glossário: altera, impede colisão com outro termo, exclui e libera a chave", async () => {
        expect((await consultar(`/transcricao/glossario/${termoId}`, "mestre", "PUT", { termo: "ZÉ" })).status).toBe(200);
        expect((await consultar(`/transcricao/glossario/${termoId}`, "mestre", "PUT", { termo: "ze" })).status).toBe(409);
        expect((await consultar(`/transcricao/glossario/${termoId}`, "mestre", "DELETE")).status).toBe(200);
        expect((await consultar(`/transcricao/glossario/${termoId}`, "mestre", "DELETE")).status).toBe(404);
        expect((await consultar("/transcricao/glossario", "mestre", "POST", { campanhaId, termo: "zé" })).status).toBe(201);
    });
    it("guards negam visitante, token expirado, tokenVersao antigo e conta excluída", async () => {
        const rota = `/transcricao/sessao/${sessaoId}`;
        expect((await consultar(rota, null)).status).toBe(401);
        tokens.expirado = jwt.sign({ sub: ids.mestre, tokenVersao: 1 }, { expiresIn: -1 });
        expect((await consultar(rota, "expirado")).status).toBe(401);
        await conexao.raw("UPDATE usuario SET token_versao = 2 WHERE id = :id", { id: ids.tester });
        expect((await consultar(rota, "tester")).status).toBe(401);
        await conexao.raw("UPDATE usuario SET is_deleted = true, deleted_date = NOW() WHERE id = :id", { id: ids.admin });
        expect((await consultar(rota, "admin")).status).toBe(401);
    });
    it("valida corpo, filtro e metadados sem 500", async () => {
        for (const corpo of [{ campanhaId, titulo: "" }, { campanhaId, titulo: 9 },
            { campanhaId, titulo: "S", wav: "bytes" }, { campanhaId: "9", titulo: "S" }]) {
            expect((await consultar("/transcricao/sessao", "mestre", "POST", corpo)).status).toBe(400);
        }
        expect((await consultar<SessaoTranscricaoResumoDto[]>(`/transcricao/sessao?campanhaId=${campanhaId}&arquivadas=abc`, "mestre")).status).toBe(400);
        expect((await consultar(`/transcricao/sessao/${sessaoId}/faixa`, "mestre", "POST",
            { nomeArquivo: "C:\\privado\\a.wav", participante: "A", deslocamentoMilissegundos: 0 })).status).toBe(400);
        expect((await consultar("/transcricao/sessao", "mestre", "POST", { campanhaId: outraCampanhaId, titulo: "Ataque" })).status).toBe(404);
    });
    it("recusa IDs maiores que INTEGER antes de chamar SQL", async () => {
        expect((await consultar("/transcricao/sessao/2147483648", "mestre")).status).toBe(400);
        expect((await consultar("/transcricao/faixa/2147483648", "mestre")).status).toBe(400);
        expect((await consultar("/transcricao/sessao?campanhaId=2147483648", "mestre")).status).toBe(400);
    });
    it("arquiva/desarquiva mantendo a faixa e sem reaproveitar id do corpo", async () => {
        expect((await consultar(`/transcricao/sessao/${sessaoId}/arquivamento`, "mestre", "PUT", { arquivada: true })).status).toBe(200);
        expect((await consultar<SessaoTranscricaoResumoDto[]>(`/transcricao/sessao?campanhaId=${campanhaId}`, "mestre")).corpo.dados).toEqual([]);
        expect((await consultar<SessaoTranscricaoResumoDto[]>(`/transcricao/sessao?campanhaId=${campanhaId}&arquivadas=true`, "mestre")).corpo.dados).toHaveLength(1);
        expect((await consultar(`/transcricao/faixa/${faixaId}`, "mestre")).status).toBe(200);
        const alterada = await consultar<SessaoTranscricaoAlteradaDto>(`/transcricao/sessao/${sessaoId}`, "mestre", "PUT", { id: 2147483647, titulo: "Nova" });
        expect(alterada.corpo.dados!.id).toBe(sessaoId);
        expect((await consultar(`/transcricao/sessao/${sessaoId}/arquivamento`, "mestre", "PUT", { arquivada: false })).status).toBe(200);
    });
    it("transferência de Mestre revoga antiga leitura e autoriza o novo papel", async () => {
        await conexao.transaction(async (transacao) => {
            await transacao.raw(`UPDATE campanha_membro SET tipo_campanha_membro_papel_id =
                (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = 'JOGADOR' AND is_deleted = false)
                WHERE campanha_id = :campanhaId AND usuario_id = :id AND is_deleted = false`, { campanhaId, id: ids.mestre });
            await transacao.raw(`UPDATE campanha_membro SET tipo_campanha_membro_papel_id =
                (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = 'MESTRE' AND is_deleted = false)
                WHERE campanha_id = :campanhaId AND usuario_id = :id AND is_deleted = false`, { campanhaId, id: ids.jogador });
        });
        expect((await consultar(`/transcricao/sessao/${sessaoId}`, "mestre")).status).toBe(404);
        expect((await consultar(`/transcricao/sessao/${sessaoId}`, "jogador")).status).toBe(200);
    });
    it("glossário: depois da transferência o ex-Mestre perde o acesso e o novo Mestre passa a ter", async () => {
        expect((await consultar(`/transcricao/glossario?campanhaId=${campanhaId}`, "mestre")).status).toBe(404);
        expect((await consultar("/transcricao/glossario", "mestre", "POST", { campanhaId, termo: "Antigo" })).status).toBe(404);
        expect((await consultar(`/transcricao/glossario?campanhaId=${campanhaId}`, "jogador")).status).toBe(200);
    });
    it("exclui por soft delete e deixa filhos inacessíveis", async () => {
        expect((await consultar(`/transcricao/sessao/${sessaoId}`, "jogador", "DELETE")).status).toBe(200);
        expect((await consultar(`/transcricao/faixa/${faixaId}`, "jogador")).status).toBe(404);
        expect((await consultar(`/transcricao/sessao/${sessaoId}/faixa`, "jogador", "POST",
            { nomeArquivo: "b.wav", participante: "B", deslocamentoMilissegundos: 0 })).status).toBe(404);
        const result = await conexao.raw<{ rows: { total: number }[] }>(
            "SELECT COUNT(*)::integer AS total FROM sessao_transcricao WHERE id = :id AND is_deleted = true", { id: sessaoId });
        expect(result.rows[0].total).toBe(1);
    });
});
