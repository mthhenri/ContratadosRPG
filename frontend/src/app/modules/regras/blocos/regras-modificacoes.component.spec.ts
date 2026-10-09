import { TestBed } from "@angular/core/testing";
import { RegrasModificacoesRender } from "./regras-modificacoes.component";

describe("RegrasModificacoesRender", () => {
    it("mostra a nota excepcional de custo/peso antes dos itens", () => {
        const fixture = TestBed.createComponent(RegrasModificacoesRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "modificacoes", cabecalho: [], linhas: [], itens: [],
            nota: [{ tipo: "texto", texto: "Modificações de Explosivos custam 250 $." }],
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector("app-regras-nota")?.textContent)
            .toContain("Modificações de Explosivos custam 250 $.");
    });
    it("preserva compras múltiplas no empilhamento e torna Bloqueia legível", () => {
        const fixture = TestBed.createComponent(RegrasModificacoesRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "modificacoes", cabecalho: [], linhas: [], itens: [{
                nome: "Pesada", empilhamento: "■■■□□",
                efeito: [{ tipo: "texto", texto: "Efeito preservado" }],
                bloqueia: [{ tipo: "texto", texto: "Veloz" }],
            }],
        });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        const marcas = raiz.querySelector(".regras-modificacoes__empilhamento");
        expect(marcas?.textContent?.replace(/\s/g, "")).toBe("■■■□□");
        expect(marcas?.querySelectorAll(".regras-modificacoes__marca--cheia").length).toBe(3);
        expect(raiz.querySelector(".regras-modificacoes__bloqueia")?.textContent)
            .toContain("Bloqueia: Veloz");
        expect(raiz.textContent).toContain("Efeito preservado");
    });
});
