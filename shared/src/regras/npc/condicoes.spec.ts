import { describe, expect, it } from "vitest";
import { resolverMorrendo } from "./condicoes";

describe("Guia de mestre — NPC > Vida: Morrendo", () => {
    it.each([0, -1])("ativa em Vida %s", (vidaAtual) => {
        expect(resolverMorrendo({ vidaAtual, morrendo: false })).toBe(true);
    });
    it("cura não remove a condição", () => {
        expect(resolverMorrendo({ vidaAtual: 10, morrendo: true })).toBe(true);
    });
    it("permite remoção explícita depois de socorro, com Vida positiva", () => {
        expect(resolverMorrendo({ vidaAtual: 10, morrendo: false })).toBe(false);
    });
});
