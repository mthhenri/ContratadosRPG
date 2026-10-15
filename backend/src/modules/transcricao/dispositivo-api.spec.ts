import { randomUUID, randomBytes, createHash } from "node:crypto";
import knex, { type Knex } from "knex";
import { JwtService } from "@nestjs/jwt";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
describe.runIf(process.env.TESTAR_API_DISPOSITIVO === "1")("App REST real + guards", () => {
    const origem = "http://127.0.0.1:53101"; let db: Knex;
    const jwt = new JwtService({ secret: "transcricao_segredo_somente_teste_local" });
    const usuarios: Record<string, { id: number; token: string }> = {};
    let sessaoId: number; let campanhaId: number;
    const chamar = async <T>(rota: string, token: string | null, method = "GET", dto?: unknown) => {
        const r = await fetch(origem + rota, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: dto === undefined ? undefined : JSON.stringify(dto) });
        return { status: r.status, dados: (await r.json() as StandardResponse<T>).dados as T };
    };
    beforeAll(async () => {
        db = knex({ client: "pg", connection: { host: "127.0.0.1", port: 55439, user: "postgres", password: "transcricao_local_test", database: "transcricao_test" } });
        for (const nome of ["mestre", "alheio", "admin", "tester", "jogador"]) {
            const login = randomUUID(); const tipo = nome === "admin" ? "ADMIN" : nome === "tester" ? "TESTER" : "NORMAL";
            const u = await db.raw<{ rows: { id: number }[] }>(`INSERT INTO usuario (login, senha, nome, tipo_usuario_id, token_versao, created_date, updated_date, is_deleted)
              SELECT :login, 'teste', :nome, id, 1, NOW(), NOW(), false FROM tipo_usuario WHERE codigo = :tipo AND is_deleted = false RETURNING id`, { login, nome, tipo });
            usuarios[nome] = { id: u.rows[0].id, token: jwt.sign({ sub: u.rows[0].id, login, tipo, tokenVersao: 1 }) };
        }
        const c = await chamar<{ id: number }>("/campanha", usuarios.mestre.token, "POST", { nome: "Teste app", descricao: "" });
        expect(c.status).toBe(201); campanhaId = c.dados.id;
        const s = await chamar<{ id: number }>("/transcricao/sessao", usuarios.mestre.token, "POST", { campanhaId, titulo: "Sessão app" });
        sessaoId = s.dados.id;
    });
    afterAll(async () => { await db?.destroy(); });
    const iniciar = async () => {
        const segredo = randomBytes(32).toString("base64url");
        const r = await chamar<{ identificador: string; codigo: string }>("/transcricao/vinculo", null, "POST", { nome: "PC", segredoHash: createHash("sha256").update(segredo).digest("hex") });
        expect(r.status).toBe(201); return { ...r.dados, segredo };
    };
    const vincular = async () => {
        const p = await iniciar(); const r = await chamar(`/transcricao/vinculo/${p.identificador}/confirmar`, usuarios.mestre.token, "POST", { codigo: p.codigo });
        expect(r.status).toBe(201); return p;
    };
    it("pendente não acessa app e confirmação exige JWT", async () => {
        const p = await iniciar();
        expect((await chamar(`/transcricao/vinculo/${p.identificador}/confirmar`, null, "POST", { codigo: p.codigo })).status).toBe(401);
        expect((await chamar("/transcricao/aplicativo/vinculo", p.segredo, "DELETE")).status).toBe(401);
        const estado = await chamar<{ vinculado: boolean; usuarioId: null }>("/transcricao/vinculo/estado", p.segredo);
        expect(estado.dados.usuarioId).toBeNull(); expect(estado.dados.vinculado).toBe(false);
    });
    it("admin/tester/jogador sem Mestre não vinculam", async () => {
        const p = await iniciar();
        for (const nome of ["admin", "tester", "jogador"]) expect((await chamar(`/transcricao/vinculo/${p.identificador}/confirmar`, usuarios[nome].token, "POST", { codigo: p.codigo })).status).toBe(404);
    });
    it("JWT web nunca autentica app; segredo app não autentica outro módulo", async () => {
        const p = await vincular();
        expect((await chamar("/transcricao/aplicativo/vinculo", usuarios.mestre.token, "DELETE")).status).toBe(401);
        expect((await chamar("/campanha", p.segredo)).status).toBe(401);
        expect((await chamar("/transcricao/aplicativo/vinculo", null, "DELETE")).status).toBe(401);
    });
    it("abre contexto autorizado e rejeita replay", async () => {
        const p = await vincular();
        const i = await chamar<{ identificador: string }>(`/transcricao/sessao/${sessaoId}/abertura`, usuarios.mestre.token, "POST");
        const r = await chamar<{ sessaoId: number }>(`/transcricao/aplicativo/abertura/${i.dados.identificador}`, p.segredo, "POST");
        expect(r.status).toBe(201); expect(r.dados.sessaoId).toBe(sessaoId);
        expect((await chamar(`/transcricao/aplicativo/abertura/${i.dados.identificador}`, p.segredo, "POST")).status).toBe(404);
        expect((await chamar<{ confirmada: boolean }>(`/transcricao/abertura/${i.dados.identificador}`, usuarios.mestre.token)).dados.confirmada).toBe(true);
        expect((await chamar(`/transcricao/abertura/${i.dados.identificador}`, usuarios.alheio.token)).status).toBe(404);
    });
    it("transferência de Mestre impede abrir e preserva intenção não consumida", async () => {
        const p = await vincular();
        const i = await chamar<{ identificador: string }>(`/transcricao/sessao/${sessaoId}/abertura`, usuarios.mestre.token, "POST");
        await db.raw(`UPDATE campanha_membro SET is_deleted = true WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId`, { campanhaId, usuarioId: usuarios.mestre.id });
        try {
            expect((await chamar(`/transcricao/aplicativo/abertura/${i.dados.identificador}`, p.segredo, "POST")).status).toBe(404);
            expect((await chamar<{ confirmada: boolean }>(`/transcricao/abertura/${i.dados.identificador}`, usuarios.mestre.token)).dados.confirmada).toBe(false);
        } finally { await db.raw(`UPDATE campanha_membro SET is_deleted = false WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId`, { campanhaId, usuarioId: usuarios.mestre.id }); }
    });
    it("revogação online impede reutilização do segredo", async () => {
        const p = await vincular();
        expect((await chamar("/transcricao/aplicativo/vinculo", p.segredo, "DELETE")).status).toBe(200);
        expect((await chamar("/transcricao/aplicativo/vinculo", p.segredo, "DELETE")).status).toBe(401);
    });
    it("cancelar pedido por prova de segredo impede confirmação tardia", async () => {
        const p = await iniciar();
        expect((await chamar("/transcricao/vinculo", p.segredo, "DELETE")).status).toBe(200);
        expect((await chamar(`/transcricao/vinculo/${p.identificador}/confirmar`, usuarios.mestre.token, "POST", { codigo: p.codigo })).status).toBe(404);
        expect((await chamar("/transcricao/vinculo", null, "DELETE")).status).toBe(401);
        expect((await chamar("/transcricao/vinculo", usuarios.mestre.token, "DELETE")).status).toBe(401);
    });
    it("revogação web remove apenas dispositivo próprio", async () => {
        const p = await vincular();
        expect((await chamar(`/transcricao/dispositivo/${p.identificador}`, usuarios.alheio.token, "DELETE")).status).toBe(200);
        expect((await chamar<{ vinculado: boolean }>("/transcricao/vinculo/estado", p.segredo)).dados.vinculado).toBe(true);
        expect((await chamar(`/transcricao/dispositivo/${p.identificador}`, usuarios.mestre.token, "DELETE")).status).toBe(200);
        expect((await chamar<{ vinculado: boolean }>("/transcricao/vinculo/estado", p.segredo)).dados.vinculado).toBe(false);
    });
    it("OpenAPI distingue JWT, segredo de app e início público", async () => {
        const doc = await (await fetch(origem + "/api/docs-json")).json() as OpenAPIObject;
        expect(doc.paths["/transcricao/vinculo"].post?.security).toEqual([]);
        expect(doc.paths["/transcricao/dispositivo"].get?.security).toEqual([{ jwt: [] }]);
        expect(doc.paths["/transcricao/aplicativo/vinculo"].delete?.security).toEqual([{ dispositivo: [] }]);
        expect(doc.paths["/transcricao/vinculo/estado"].get?.security).toEqual([{ dispositivo: [] }]);
    });
});
