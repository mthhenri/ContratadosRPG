import { describe, expect, it } from "vitest";

import { EMPILHAMENTO_MAXIMO, montarEmpilhamento } from "./oficina-empilhamento";

describe("montarEmpilhamento", () => {
    it("monta as caixas cheias e vazias", () => {
        expect(montarEmpilhamento(1, 5)).toBe("■□□□□");
        expect(montarEmpilhamento(2, 2)).toBe("■■");
    });

    it("não deixa os iniciais passarem do teto nem ficarem abaixo de um", () => {
        expect(montarEmpilhamento(4, 2)).toBe("■■");
        expect(montarEmpilhamento(0, 3)).toBe("■□□");
    });

    it("limita o teto", () => {
        expect(montarEmpilhamento(1, 99)).toHaveLength(EMPILHAMENTO_MAXIMO);
        expect(montarEmpilhamento(1, 0)).toBe("■");
    });
});
