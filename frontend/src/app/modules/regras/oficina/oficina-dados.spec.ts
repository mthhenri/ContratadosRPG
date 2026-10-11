import { describe, expect, it } from "vitest";

import { definirNoCaminho, lerNoCaminho, nomeDoCaminho } from "./oficina-dados";

describe("oficina-dados", () => {
    const dados = { nome: "Faca", danos: [{ rotulo: "DANO", trechos: ["a"] }, { rotulo: "UMA MÃO", trechos: ["b"] }] };

    it("lê um campo plano e um caminho dentro de lista", () => {
        expect(lerNoCaminho(dados, ["nome"])).toBe("Faca");
        expect(lerNoCaminho(dados, ["danos", 1, "trechos"])).toEqual(["b"]);
        expect(lerNoCaminho(dados, ["danos", 5, "trechos"])).toBeUndefined();
        expect(lerNoCaminho(null, ["nome"])).toBeUndefined();
    });

    it("define um campo plano sem alterar o original", () => {
        const novo = definirNoCaminho(dados, ["nome"], "Machete");
        expect(novo.nome).toBe("Machete");
        expect(dados.nome).toBe("Faca");
        expect(novo.danos).toBe(dados.danos);
    });

    it("define dentro de uma lista e compartilha o que não mudou", () => {
        const novo = definirNoCaminho(dados, ["danos", 1, "trechos"], ["x"]);
        expect(novo.danos[1].trechos).toEqual(["x"]);
        expect(dados.danos[1].trechos).toEqual(["b"]);
        expect(novo.danos[0]).toBe(dados.danos[0]);
    });

    it("com valor indefinido retira o campo", () => {
        const novo = definirNoCaminho({ ...dados, porte: ["P"] }, ["porte"], undefined);
        expect("porte" in novo).toBe(false);
        expect(novo.nome).toBe("Faca");
    });

    it("cria os passos que faltam", () => {
        expect(definirNoCaminho({}, ["danos", 0, "rotulo"], "DANO")).toEqual({ danos: [{ rotulo: "DANO" }] });
    });

    it("dá nome estável ao caminho", () => {
        expect(nomeDoCaminho(["trechos"])).toBe("trechos");
        expect(nomeDoCaminho(["danos", 0, "trechos"])).toBe("danos.0.trechos");
    });
});
