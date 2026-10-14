import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import knex, { type Knex } from "knex";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { DispositivoRepository } from "./dispositivo.repository";
import { contextoTransacao, TransacaoService } from "../../database/transacao.service";
/** Opt-in: somente banco descartável fixo, preparado com as 38 migrations. */
describe.runIf(process.env.TESTAR_POSTGRES_DISPOSITIVO === "1")("Vínculo PostgreSQL real", () => {
    let db: Knex; let repo: DispositivoRepository; let usuarioId: number; let sessaoId: number;
    beforeAll(async () => {
        db = knex({ client: "pg", connection: { host: "127.0.0.1", port: 55439, database: "transcricao_test", user: "postgres", password: "transcricao_local_test" } });
        repo = new DispositivoRepository(db);
        const u = await db.raw<{ rows: { id: number }[] }>(`INSERT INTO usuario (login, senha, nome, tipo_usuario_id, token_versao, created_date, updated_date, is_deleted)
            SELECT :login, 'teste', 'Mestre', tipo_usuario.id, 1, NOW(), NOW(), false FROM tipo_usuario WHERE codigo = 'NORMAL' AND is_deleted = false RETURNING id`, { login: randomUUID() });
        usuarioId = u.rows[0].id;
        const c = await db.raw<{ rows: { id: number }[] }>(`INSERT INTO campanha (nome, descricao, codigo_convite, codigo_convite_espectador, na_base, created_date, updated_date, is_deleted)
            SELECT 'Teste', '', :a, :b, true, NOW(), NOW(), false RETURNING id`, { a: randomUUID(), b: randomUUID() });
        const s = await db.raw<{ rows: { id: number }[] }>(`INSERT INTO sessao_transcricao (identificador, campanha_id, titulo, arquivada, created_date, updated_date, is_deleted)
            SELECT :id, :campanhaId, 'Teste', false, NOW(), NOW(), false RETURNING id`, { id: randomUUID(), campanhaId: c.rows[0].id });
        sessaoId = s.rows[0].id;
    });
    afterAll(async () => { await db?.destroy(); });
    const pedido = async () => {
        const segredo = randomBytes(32).toString("base64url");
        const segredoHash = createHash("sha256").update(segredo).digest("hex");
        const identificador = randomUUID(); const codigo = "1234ABCD";
        await repo.iniciar({ nome: "PC", segredoHash, identificador, codigo });
        return { identificador, codigo, segredoHash };
    };
    const dispositivo = async () => {
        const p = await pedido(); await repo.confirmar({ ...p, usuarioId, tokenVersao: 1 });
        const auth = (await repo.autenticar({ segredoHash: p.segredoHash }))!;
        return { ...p, ...auth };
    };
    it("pendente não autentica nem revela identidade", async () => {
        const p = await pedido();
        expect(await repo.autenticar(p)).toBeNull();
        expect(await repo.consultarEstado(p)).toEqual({ vinculado: false, expirado: false, usuarioId: null, login: null });
    });
    it("confirma uma única vez mesmo com duas contas concorrentes", async () => {
        const p = await pedido();
        const rs = await Promise.all([repo.confirmar({ ...p, usuarioId, tokenVersao: 1 }), repo.confirmar({ ...p, usuarioId, tokenVersao: 1 })]);
        expect(rs.filter(Boolean)).toHaveLength(1);
    });
    it("prazo do pedido rejeita confirmação; hash duplicado não insere", async () => {
        const p = await pedido();
        await db.raw(`UPDATE transcricao_vinculo SET expira_em = NOW() - INTERVAL '1 second' WHERE identificador = :identificador`, p);
        expect(await repo.confirmar({ ...p, usuarioId, tokenVersao: 1 })).toBeNull();
        expect(await repo.iniciar({ ...p, identificador: randomUUID(), nome: "Outro" })).toBeNull();
    });
    it("90 dias de inatividade não renova credencial expirada", async () => {
        const d = await dispositivo();
        await db.raw(`UPDATE transcricao_dispositivo SET ultimo_uso = NOW() - INTERVAL '91 days' WHERE identificador = :identificador`, d);
        expect(await repo.autenticar(d)).toBeNull();
    });
    it("revogação respeita proprietário e impede autenticação", async () => {
        const d = await dispositivo();
        await repo.revogar({ identificador: d.identificador, usuarioId: usuarioId + 999 });
        expect(await repo.autenticar(d)).not.toBeNull();
        await repo.revogar({ identificador: d.identificador, usuarioId });
        expect(await repo.autenticar(d)).toBeNull();
    });
    it("tokenVersao e exclusão da conta invalidam credencial", async () => {
        const d = await dispositivo();
        await db.raw(`UPDATE usuario SET token_versao = 2 WHERE id = :usuarioId`, { usuarioId });
        expect(await repo.autenticar(d)).toBeNull();
        await db.raw(`UPDATE usuario SET token_versao = 1, is_deleted = true WHERE id = :usuarioId`, { usuarioId });
        expect(await repo.autenticar(d)).toBeNull();
        await db.raw(`UPDATE usuario SET is_deleted = false WHERE id = :usuarioId`, { usuarioId });
    });
    it("intenção expirada, proprietário errado e replay não consomem", async () => {
        const d = await dispositivo(); const identificador = randomUUID();
        await repo.criarIntencao({ identificador, usuarioId, sessaoId });
        const dto = { identificador, usuarioId, dispositivoId: d.dispositivoId, tokenVersao: 1 };
        expect(await repo.consumirIntencao({ ...dto, usuarioId: usuarioId + 999 })).toBeNull();
        expect(await repo.consumirIntencao(dto)).toEqual({ sessaoId });
        expect(await repo.consumirIntencao(dto)).toBeNull();
        const exp = randomUUID(); await repo.criarIntencao({ identificador: exp, usuarioId, sessaoId });
        await db.raw(`UPDATE transcricao_intencao SET expira_em = NOW() - INTERVAL '1 second' WHERE identificador = :identificador`, { identificador: exp });
        expect(await repo.consumirIntencao({ ...dto, identificador: exp })).toBeNull();
    });
    it("dois resgates concorrentes entregam apenas uma abertura", async () => {
        const d = await dispositivo(); const identificador = randomUUID();
        await repo.criarIntencao({ identificador, usuarioId, sessaoId });
        const dto = { identificador, usuarioId, dispositivoId: d.dispositivoId, tokenVersao: 1 };
        const rs = await Promise.all([repo.consumirIntencao(dto), repo.consumirIntencao(dto)]);
        expect(rs.filter(Boolean)).toHaveLength(1);
    });
    it("revogação que vence a corrida impede resgate após espera", async () => {
        const d = await dispositivo(); const identificador = randomUUID();
        await repo.criarIntencao({ identificador, usuarioId, sessaoId });
        const tx = await db.transaction(); let terminou = false;
        await contextoTransacao.run(tx, () => repo.revogar({ identificador: d.identificador, usuarioId }));
        const resgate = repo.consumirIntencao({ identificador, usuarioId, dispositivoId: d.dispositivoId, tokenVersao: 1 }).then(r => { terminou = true; return r; });
        try {
            await new Promise(resolve => setTimeout(resolve, 40)); expect(terminou).toBe(false);
            await tx.commit(); expect(await resgate).toBeNull();
        } finally { await tx.rollback(); await resgate; }
    });
    it("rollback preserva intenção quando autorização da sessão falha", async () => {
        const d = await dispositivo(); const identificador = randomUUID();
        await repo.criarIntencao({ identificador, usuarioId, sessaoId });
        const tx = await db.transaction();
        await contextoTransacao.run(tx, () => repo.consumirIntencao({ identificador, usuarioId, dispositivoId: d.dispositivoId, tokenVersao: 1 }));
        await tx.rollback();
        expect(await repo.consultarIntencao({ identificador, usuarioId })).toEqual({ confirmada: false, expirada: false });
    });
    it("mudança de tokenVersao entre guard e consumo é rejeitada", async () => {
        const d = await dispositivo(); const identificador = randomUUID();
        await repo.criarIntencao({ identificador, usuarioId, sessaoId });
        await db.raw(`UPDATE usuario SET token_versao = 2 WHERE id = :usuarioId`, { usuarioId });
        try { expect(await repo.consumirIntencao({ identificador, usuarioId, dispositivoId: d.dispositivoId, tokenVersao: 1 })).toBeNull(); }
        finally { await db.raw(`UPDATE usuario SET token_versao = 1 WHERE id = :usuarioId`, { usuarioId }); }
    });
    it("cancelar pedido impede confirmação posterior", async () => {
        const p = await pedido();
        await new TransacaoService(db).executar(() => repo.revogarCredencial(p));
        expect(await repo.confirmar({ ...p, usuarioId, tokenVersao: 1 })).toBeNull();
        expect(await repo.consultarEstado(p)).toEqual({ vinculado: false, expirado: true, usuarioId: null, login: null });
    });
    it("cancelamento que espera confirmação também revoga dispositivo recém-criado", async () => {
        const p = await pedido(); const tx = await db.transaction();
        await contextoTransacao.run(tx, () => repo.confirmar({ ...p, usuarioId, tokenVersao: 1 }));
        let terminou = false;
        const cancelamento = new TransacaoService(db).executar(() => repo.revogarCredencial(p)).then(() => { terminou = true; });
        try {
            await new Promise(resolve => setTimeout(resolve, 40)); expect(terminou).toBe(false);
            await tx.commit(); await cancelamento;
            expect(await repo.autenticar(p)).toBeNull();
        } finally { await tx.rollback(); await cancelamento; }
    });
    it("migration DOWN/UP é reversível em banco descartável", async () => {
        const sql = readFileSync(resolve(__dirname, "../../database/migrations/0038 - Vinculo do transcriber.sql"), "utf8");
        await db.transaction(t => t.raw(sql.split(/^-- DOWN$/m)[1]));
        await db.transaction(t => t.raw(sql.split(/^-- UP$/m)[1].split(/^-- DOWN$/m)[0]));
        expect(await repo.listar({ usuarioId })).toEqual([]);
    });
});
