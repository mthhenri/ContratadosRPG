import { TestBed } from "@angular/core/testing";
import { RegrasLeituraStore } from "./regras-leitura.store";

describe("RegrasLeituraStore", () => {
    it("lembra uma seção independente por livro ao alternar a consulta", () => {
        const memoria = TestBed.inject(RegrasLeituraStore);
        memoria.lembrarSecao("sistema", "vida");
        memoria.selecionarLivro("guia");
        memoria.lembrarSecao("guia", "atributos");
        memoria.selecionarLivro("sistema");
        expect(memoria.livro()).toBe("sistema");
        expect(memoria.recuperarSecao("sistema")).toBe("vida");
        expect(memoria.recuperarSecao("guia")).toBe("atributos");
        memoria.lembrarSecao("sistema", null);
        expect(memoria.recuperarSecao("guia")).toBe("atributos");
    });
});
