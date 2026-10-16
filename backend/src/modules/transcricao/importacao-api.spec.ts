import { createHash, randomBytes, randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import knex, { type Knex } from "knex";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import type {
    FaixaTranscricaoAlteradaDto, FaixaTranscricaoCriadaDto, FaixaTranscricaoResumoDto,
    IdentidadeTranscricaoCriadaDto, IdentidadeTranscricaoResumoDto, SessaoTranscricaoCriadaDto,
    TermoGlossarioTranscricaoResumoDto,
} from "@contratados-rpg/shared/dtos/transcricao";

/**
 * REST real da importação (task 02): backend compilado na porta fixa 53101, DB descartável 127.0.0.1:55439.
 * Cobre as rotas web (JWT do Mestre) e as rotas do app (segredo do dispositivo), com a matriz de acesso.
 */
describe.runIf(process.env.TESTAR_API_IMPORTACAO === "1")("Importação REST (web + app) + PostgreSQL", () => {
    const origem = "http://127.0.0.1:53101";
    const jwt = new JwtService({ secret: "transcricao_segredo_somente_teste_local" });
    const jwtTokens: Record<string, string> = {};
    const ids: Record<string, number> = {};
    const segredos: Record<string, string> = {};
    let conexao: Knex;
    let campanhaId: number;
    let outraCampanhaId: number;
    let sessaoId: number;
    let faixaId: number;
    let identidadeId: number;

    const chamar = async <T = unknown>(caminho: string, credencial: string | null, metodo = "GET", corpo?: unknown) => {
        const resposta = await fetch(`${origem}${caminho}`, { method: metodo,
            headers: { "Content-Type": "application/json", ...(credencial ? { Authorization: `Bearer ${credencial}` } : {}) },
            body: corpo === undefined ? undefined : JSON.stringify(corpo) });
        return { status: resposta.status, corpo: await resposta.json() as StandardResponse<T> };
    };
    const web = <T = unknown>(caminho: string, ator: string | null, metodo = "GET", corpo?: unknown) =>
        chamar<T>(caminho, ator ? jwtTokens[ator] : null, metodo, corpo);
    const app = <T = unknown>(caminho: string, dispositivo: string | null, metodo = "GET", corpo?: unknown) =>
        chamar<T>(caminho, dispositivo ? segredos[dispositivo] : null, metodo, corpo);
    const vincular = async (ator: string, nome: string) => {
        const segredo = randomBytes(32).toString("base64url");
        const pedido = await chamar<{ identificador: string; codigo: string }>("/transcricao/vinculo", null, "POST",
            { nome, segredoHash: createHash("sha256").update(segredo).digest("hex") });
        expect(pedido.status).toBe(201);
        const confirmado = await web(`/transcricao/vinculo/${pedido.corpo.dados!.identificador}/confirmar`, ator, "POST",
            { codigo: pedido.corpo.dados!.codigo });
        expect(confirmado.status).toBe(201);
        segredos[nome] = segredo;
    };

    beforeAll(async () => {
        conexao = knex({ client: "pg", connection: { host: "127.0.0.1", port: 55439,
            database: "transcricao_test", user: "postgres", password: "transcricao_local_test" } });
        expect((await chamar("/health", null)).status).toBe(200);
        for (const [ator, tipo] of [["mestre", "NORMAL"], ["jogador", "NORMAL"], ["espectador", "NORMAL"],
            ["alheio", "NORMAL"], ["admin", "ADMIN"], ["tester", "TESTER"]]) {
            const login = `importacao-${randomUUID()}`;
            const criado = await conexao.raw<{ rows: { id: number }[] }>(`INSERT INTO usuario
                (login, senha, nome, tipo_usuario_id, token_versao, created_date, updated_date, is_deleted)
                SELECT :login, 'hash-teste-sem-login', :ator, tipo_usuario.id, 1, NOW(), NOW(), false
                FROM tipo_usuario WHERE codigo = :tipo AND is_deleted = false RETURNING id`, { login, ator, tipo });
            ids[ator] = criado.rows[0].id;
            jwtTokens[ator] = jwt.sign({ sub: ids[ator], login, tipo, tokenVersao: 1 }, { expiresIn: "1h" });
        }
        const campanha = await web<{ id: number }>("/campanha", "mestre", "POST", { nome: "Importação A", descricao: "" });
        campanhaId = campanha.corpo.dados!.id;
        const outra = await web<{ id: number }>("/campanha", "alheio", "POST", { nome: "Importação B", descricao: "" });
        outraCampanhaId = outra.corpo.dados!.id;
        for (const ator of ["jogador", "espectador", "admin", "tester"]) {
            await conexao.raw(`INSERT INTO campanha_membro
                (campanha_id, usuario_id, tipo_campanha_membro_papel_id, created_date, updated_date, is_deleted)
                SELECT :campanhaId, :usuarioId, tipo_campanha_membro_papel.id, NOW(), NOW(), false
                FROM tipo_campanha_membro_papel WHERE codigo = :papel AND is_deleted = false`,
            { campanhaId, usuarioId: ids[ator], papel: ator === "espectador" ? "ESPECTADOR" : "JOGADOR" });
        }
        const sessao = await web<SessaoTranscricaoCriadaDto>("/transcricao/sessao", "mestre", "POST", { campanhaId, titulo: "Sessão" });
        sessaoId = sessao.corpo.dados!.id;
        await vincular("mestre", "app-mestre");
        await vincular("alheio", "app-alheio");
    });
    afterAll(async () => { await conexao?.destroy(); });

    it("web: Mestre cria identidade; origem repetida (caixa) é 409; participante parecido exige confirmação", async () => {
        const criada = await web<IdentidadeTranscricaoCriadaDto>("/transcricao/identidade", "mestre", "POST",
            { campanhaId, nomeOrigem: " 1-joao ", participante: "João" });
        expect(criada.status).toBe(201);
        expect(criada.corpo.dados).toMatchObject({ campanhaId, nomeOrigem: "1-joao", participante: "João", parecidoCom: null });
        identidadeId = criada.corpo.dados!.id;
        expect((await web("/transcricao/identidade", "mestre", "POST", { campanhaId, nomeOrigem: "1-JOAO", participante: "João" })).status).toBe(409);
        expect((await web("/transcricao/identidade", "mestre", "POST", { campanhaId, nomeOrigem: "2-joao", participante: "Joao" })).status).toBe(409);
        const confirmada = await web<IdentidadeTranscricaoCriadaDto>("/transcricao/identidade", "mestre", "POST",
            { campanhaId, nomeOrigem: "2-joao", participante: "Joao", confirmarParecido: true });
        expect(confirmada.status).toBe(201);
        expect(confirmada.corpo.dados!.parecidoCom).toBe("João");
        const mesmaPessoa = await web<IdentidadeTranscricaoCriadaDto>("/transcricao/identidade", "mestre", "POST",
            { campanhaId, nomeOrigem: "joao_alt", participante: "João" });
        expect(mesmaPessoa.status).toBe(201);
        const lista = await web<IdentidadeTranscricaoResumoDto[]>(`/transcricao/identidade?campanhaId=${campanhaId}`, "mestre");
        expect(lista.corpo.dados!.map((item) => item.nomeOrigem)).toEqual(["1-joao", "2-joao", "joao_alt"]);
    });

    it("web: corpo inválido é 400 e não grava", async () => {
        for (const corpo of [{ campanhaId, nomeOrigem: "", participante: "A" }, { campanhaId, nomeOrigem: "a", participante: "  " },
            { campanhaId, nomeOrigem: "a\nb", participante: "A" }, { campanhaId, nomeOrigem: "a", participante: "A", wav: "bytes" },
            { campanhaId, nomeOrigem: "a", participante: "A", confirmarParecido: "sim" }]) {
            expect((await web("/transcricao/identidade", "mestre", "POST", corpo)).status).toBe(400);
        }
    });

    it("web: faixa criada, confirmada e com offset manual; nome do arquivo não muda", async () => {
        const faixa = await web<FaixaTranscricaoCriadaDto>(`/transcricao/sessao/${sessaoId}/faixa`, "mestre", "POST",
            { nomeArquivo: "1-joao.wav", participante: "João", deslocamentoMilissegundos: 0 });
        expect(faixa.status).toBe(201);
        expect(faixa.corpo.dados).toMatchObject({ identidadeConfirmada: false, silencioInicialMilissegundos: null });
        faixaId = faixa.corpo.dados!.id;
        const ajustada = await web<FaixaTranscricaoAlteradaDto>(`/transcricao/faixa/${faixaId}`, "mestre", "PUT",
            { id: 999999, participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: -2500,
                silencioInicialMilissegundos: 1800 });
        expect(ajustada.status).toBe(200);
        expect(ajustada.corpo.dados).toMatchObject({ id: faixaId, nomeArquivo: "1-joao.wav", identidadeConfirmada: true,
            deslocamentoMilissegundos: -2500, silencioInicialMilissegundos: 1800, parecidoCom: null });
        for (const corpo of [{ participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: 1.5, silencioInicialMilissegundos: null },
            { participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: -1 },
            { participante: "João", identidadeConfirmada: "sim", deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null },
            { participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null, nomeArquivo: "x.wav" }]) {
            expect((await web(`/transcricao/faixa/${faixaId}`, "mestre", "PUT", corpo)).status).toBe(400);
        }
        const conflito = await web(`/transcricao/faixa/${faixaId}`, "mestre", "PUT",
            { participante: "JOAO", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null });
        expect(conflito.status).toBe(409);
    });

    it.each(["jogador", "espectador", "admin", "tester", "alheio"])("web: nega %s em identidades e ajuste de faixa da campanha A", async (ator) => {
        expect((await web(`/transcricao/identidade?campanhaId=${campanhaId}`, ator)).status).toBe(404);
        expect((await web("/transcricao/identidade", ator, "POST", { campanhaId, nomeOrigem: "x", participante: "X" })).status).toBe(404);
        expect((await web(`/transcricao/identidade/${identidadeId}`, ator, "PUT", { participante: "Y" })).status).toBe(404);
        expect((await web(`/transcricao/identidade/${identidadeId}`, ator, "DELETE")).status).toBe(404);
        expect((await web(`/transcricao/faixa/${faixaId}`, ator, "PUT",
            { participante: "X", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null })).status).toBe(404);
    });

    it("web: visitante sem token recebe 401", async () => {
        expect((await web(`/transcricao/identidade?campanhaId=${campanhaId}`, null)).status).toBe(401);
        expect((await web(`/transcricao/faixa/${faixaId}`, null, "PUT", {})).status).toBe(401);
    });

    it("app: o Mestre vinculado lê glossário e identidades e importa faixas pelas rotas de dispositivo", async () => {
        await web("/transcricao/glossario", "mestre", "POST", { campanhaId, termo: "Aragorn" });
        const glossario = await app<TermoGlossarioTranscricaoResumoDto[]>(`/transcricao/aplicativo/glossario?campanhaId=${campanhaId}`, "app-mestre");
        expect(glossario.status).toBe(200);
        expect(glossario.corpo.dados!.map((termo) => termo.termo)).toEqual(["Aragorn"]);
        const identidades = await app<IdentidadeTranscricaoResumoDto[]>(`/transcricao/aplicativo/identidade?campanhaId=${campanhaId}`, "app-mestre");
        expect(identidades.status).toBe(200);
        expect(identidades.corpo.dados).toHaveLength(3);
        const nova = await app<IdentidadeTranscricaoCriadaDto>("/transcricao/aplicativo/identidade", "app-mestre", "POST",
            { campanhaId, nomeOrigem: "3-maria", participante: "Maria" });
        expect(nova.status).toBe(201);
        const faixa = await app<FaixaTranscricaoCriadaDto>(`/transcricao/aplicativo/sessao/${sessaoId}/faixa`, "app-mestre", "POST",
            { sessaoId: 12345, nomeArquivo: "3-maria.wav", participante: "Maria", deslocamentoMilissegundos: 0 });
        expect(faixa.status).toBe(201);
        expect(faixa.corpo.dados!.sessaoId).toBe(sessaoId);
        const ajustada = await app<FaixaTranscricaoAlteradaDto>(`/transcricao/aplicativo/faixa/${faixa.corpo.dados!.id}`, "app-mestre", "PUT",
            { participante: "Maria", identidadeConfirmada: true, deslocamentoMilissegundos: 300, silencioInicialMilissegundos: 0 });
        expect(ajustada.status).toBe(200);
        expect(ajustada.corpo.dados).toMatchObject({ identidadeConfirmada: true, deslocamentoMilissegundos: 300 });
        const faixas = await app<FaixaTranscricaoResumoDto[]>(`/transcricao/aplicativo/sessao/${sessaoId}/faixa`, "app-mestre");
        expect(faixas.corpo.dados!.map((item) => item.nomeArquivo)).toEqual(["1-joao.wav", "3-maria.wav"]);
    });

    it("app: WAV, caminho local e hash de áudio não entram no contrato (campo extra é 400)", async () => {
        for (const extra of [{ wav: "UklGRg==" }, { caminhoLocal: "C:\\Craig\\1-joao.wav" }, { hashAudio: "a".repeat(64) }]) {
            const resposta = await app(`/transcricao/aplicativo/sessao/${sessaoId}/faixa`, "app-mestre", "POST",
                { nomeArquivo: "x.wav", participante: "X", deslocamentoMilissegundos: 0, ...extra });
            expect(resposta.status).toBe(400);
        }
        // nome com caminho também é recusado: só o nome do arquivo trafega
        expect((await app(`/transcricao/aplicativo/sessao/${sessaoId}/faixa`, "app-mestre", "POST",
            { nomeArquivo: "C:\\Craig\\x.wav", participante: "X", deslocamentoMilissegundos: 0 })).status).toBe(400);
    });

    it("app: o JWT web não autentica essas rotas e sem credencial é 401", async () => {
        for (const caminho of [`/transcricao/aplicativo/glossario?campanhaId=${campanhaId}`,
            `/transcricao/aplicativo/identidade?campanhaId=${campanhaId}`, `/transcricao/aplicativo/sessao/${sessaoId}/faixa`]) {
            expect((await chamar(caminho, jwtTokens.mestre)).status).toBe(401);
            expect((await chamar(caminho, null)).status).toBe(401);
        }
    });

    it("app: dispositivo de outro Mestre não alcança a campanha A", async () => {
        expect((await app(`/transcricao/aplicativo/glossario?campanhaId=${campanhaId}`, "app-alheio")).status).toBe(404);
        expect((await app(`/transcricao/aplicativo/identidade?campanhaId=${campanhaId}`, "app-alheio")).status).toBe(404);
        expect((await app(`/transcricao/aplicativo/sessao/${sessaoId}/faixa`, "app-alheio")).status).toBe(404);
        expect((await app(`/transcricao/aplicativo/faixa/${faixaId}`, "app-alheio", "PUT",
            { participante: "X", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null })).status).toBe(404);
        expect((await app("/transcricao/aplicativo/identidade", "app-alheio", "POST",
            { campanhaId, nomeOrigem: "invasor", participante: "I" })).status).toBe(404);
        // e o próprio glossário/identidades da campanha B ficam isolados
        const propria = await app<IdentidadeTranscricaoCriadaDto>("/transcricao/aplicativo/identidade", "app-alheio", "POST",
            { campanhaId: outraCampanhaId, nomeOrigem: "1-joao", participante: "João de B" });
        expect(propria.status).toBe(201);
    });

    it("app: dispositivo revogado perde o acesso na hora", async () => {
        await vincular("mestre", "app-descartavel");
        expect((await app(`/transcricao/aplicativo/glossario?campanhaId=${campanhaId}`, "app-descartavel")).status).toBe(200);
        expect((await app("/transcricao/aplicativo/vinculo", "app-descartavel", "DELETE")).status).toBe(200);
        expect((await app(`/transcricao/aplicativo/glossario?campanhaId=${campanhaId}`, "app-descartavel")).status).toBe(401);
    });

    it("transferência de Mestre: o dispositivo do ex-Mestre perde o acesso, sem tocar nos dados", async () => {
        await conexao.transaction(async (transacao) => {
            await transacao.raw(`UPDATE campanha_membro SET tipo_campanha_membro_papel_id =
                (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = 'JOGADOR' AND is_deleted = false)
                WHERE campanha_id = :campanhaId AND usuario_id = :id AND is_deleted = false`, { campanhaId, id: ids.mestre });
            await transacao.raw(`UPDATE campanha_membro SET tipo_campanha_membro_papel_id =
                (SELECT id FROM tipo_campanha_membro_papel WHERE codigo = 'MESTRE' AND is_deleted = false)
                WHERE campanha_id = :campanhaId AND usuario_id = :id AND is_deleted = false`, { campanhaId, id: ids.jogador });
        });
        expect((await app(`/transcricao/aplicativo/sessao/${sessaoId}/faixa`, "app-mestre")).status).toBe(404);
        expect((await app(`/transcricao/aplicativo/faixa/${faixaId}`, "app-mestre", "PUT",
            { participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null })).status).toBe(404);
        expect((await web(`/transcricao/identidade?campanhaId=${campanhaId}`, "mestre")).status).toBe(404);
        expect((await web(`/transcricao/identidade?campanhaId=${campanhaId}`, "jogador")).status).toBe(200);
    });
});
