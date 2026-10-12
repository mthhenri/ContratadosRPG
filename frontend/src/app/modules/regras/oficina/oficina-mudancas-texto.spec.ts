import { describe, expect, it } from "vitest";

import { rotuloDoCampo, valorCurto } from "./oficina-mudancas-texto";

describe("oficina-mudancas-texto", () => {
    it("dá nome legível ao campo e preserva o caminho", () => {
        expect(rotuloDoCampo("trechos")).toBe("Texto");
        expect(rotuloDoCampo("danos.0.rotulo")).toBe("Danos › 0 › rotulo");
        expect(rotuloDoCampo("campoNovo")).toBe("campoNovo");
    });

    it("mostra o valor em uma linha: texto, número, texto rico e vazio", () => {
        expect(valorCurto("Golpe")).toBe("Golpe");
        expect(valorCurto(3)).toBe("3");
        expect(valorCurto(null)).toBe("—");
        expect(valorCurto("   ")).toBe("—");
        expect(valorCurto([{ tipo: "texto", texto: "Causa " }, { tipo: "negrito", filhos: [{ tipo: "texto", texto: "dano" }] }])).toBe("Causa dano");
    });

    it("corta o valor longo e serializa o que não é texto", () => {
        expect(valorCurto("a".repeat(300))).toHaveLength(161);
        expect(valorCurto({ vida: 10 })).toBe('{"vida":10}');
    });
});
