import type { Knex } from "knex";
import { describe, expect, it, vi } from "vitest";
import { CenaDocumentoRepository } from "./cena-documento.repository";
import { contextoTransacao, TransacaoService } from "../../database/transacao.service";
import knex from "knex";
import configuracao from "../../../knexfile";

describe("CenaDocumentoRepository — foco", () => {
    it.each([700, null])("serializa a cena, limpa o índice parcial e define foco %s", async (id) => {
        const raw = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
        const repositorio = new CenaDocumentoRepository({ raw } as unknown as Knex);

        await repositorio.definirFoco({ cenaId: 900, id });

        expect(raw).toHaveBeenCalledTimes(3);
        const [sqlBloqueio, parametrosBloqueio] = raw.mock.calls[0] as [string, Record<string, unknown>];
        expect(sqlBloqueio).toContain("FROM cena");
        expect(sqlBloqueio).toContain("is_deleted = false");
        expect(sqlBloqueio).toContain("FOR UPDATE");
        expect(parametrosBloqueio).toEqual({ cenaId: 900 });
        const [sqlLimpeza, parametrosLimpeza] = raw.mock.calls[1] as [string, Record<string, unknown>];
        expect(sqlLimpeza).toContain("SET em_foco = false");
        expect(sqlLimpeza).toContain("cena_id = :cenaId");
        expect(sqlLimpeza).toContain("is_deleted = false");
        expect(parametrosLimpeza).toEqual({ cenaId: 900 });
        const [sqlFoco, parametrosFoco] = raw.mock.calls[2] as [string, Record<string, unknown>];
        expect(sqlFoco).toContain("COALESCE(cena_documento.id = :id, false)");
        expect(sqlFoco).toContain("cena_id = :cenaId");
        expect(sqlFoco).toContain("is_deleted = false");
        expect(parametrosFoco).toEqual({ cenaId: 900, id });
    });
});

describe.runIf(process.env.TESTAR_POSTGRES_FOCO === "1")("foco no PostgreSQL local", () => {
    it("troca B→A→B, limpa e mantém o índice único parcial", async () => {
        const parametros = configuracao.connection as Knex.PgConnectionConfig;
        expect(["localhost", "127.0.0.1", "::1"]).toContain(parametros.host);
        const conexao = knex(configuracao);
        const repositorio = new CenaDocumentoRepository(conexao);
        const transacaoService = new TransacaoService(conexao);
        try {
            await conexao.transaction(async (transacao) => {
                await transacao.raw(`CREATE TEMP TABLE cena (
                    id integer PRIMARY KEY, is_deleted boolean NOT NULL
                ) ON COMMIT DROP`);
                await transacao.raw(`CREATE TEMP TABLE cena_documento (
                    id integer PRIMARY KEY, cena_id integer NOT NULL,
                    is_deleted boolean NOT NULL, em_foco boolean NOT NULL
                ) ON COMMIT DROP`);
                await transacao.raw(`CREATE UNIQUE INDEX uix_foco_teste
                    ON cena_documento (cena_id) WHERE is_deleted = false AND em_foco = true`);
                await transacao.raw("INSERT INTO cena SELECT :id, false", { id: 900 });
                await transacao.raw(`INSERT INTO cena_documento
                    SELECT :id, :cenaId, false, false`, { id: 700, cenaId: 900 });
                await transacao.raw(`INSERT INTO cena_documento
                    SELECT :id, :cenaId, false, true`, { id: 701, cenaId: 900 });

                await contextoTransacao.run(transacao, async () => {
                    for (const id of [700, 701, 700, null, null]) {
                        await transacaoService.executar(() =>
                            repositorio.definirFoco({ cenaId: 900, id }),
                        );
                        const resultado = await transacao.raw<{ rows: { id: number }[] }>(
                            `SELECT id FROM cena_documento
                             WHERE cena_id = :cenaId AND is_deleted = false AND em_foco = true`,
                            { cenaId: 900 },
                        );
                        expect(resultado.rows.map((linha) => linha.id)).toEqual(id === null ? [] : [id]);
                    }
                });
            });
        } finally {
            await conexao.destroy();
        }
    });
});
