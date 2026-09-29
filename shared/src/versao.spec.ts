import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VERSAO_SISTEMA } from "./versao";

const RAIZ = resolve(__dirname, "..", "..");

function versaoDe(caminhoRelativo: string): string {
    const pacote = JSON.parse(readFileSync(join(RAIZ, caminhoRelativo), "utf8")) as { version: string };
    return pacote.version;
}

describe("versão do sistema", () => {
    it("tem formato SemVer", () => {
        expect(VERSAO_SISTEMA).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it.each(["package.json", "shared/package.json", "backend/package.json", "frontend/package.json"])(
        "%s acompanha a versão gerada (rode `npm run versao:sincronizar`)",
        (arquivo) => {
            expect(versaoDe(arquivo)).toBe(VERSAO_SISTEMA);
        },
    );

    it("package-lock.json acompanha a versão gerada", () => {
        const lock = JSON.parse(readFileSync(join(RAIZ, "package-lock.json"), "utf8")) as {
            version: string;
            packages: Record<string, { version: string }>;
        };
        expect(lock.version).toBe(VERSAO_SISTEMA);
        for (const chave of ["", "shared", "backend", "frontend"]) {
            expect(lock.packages[chave].version).toBe(VERSAO_SISTEMA);
        }
    });
});
