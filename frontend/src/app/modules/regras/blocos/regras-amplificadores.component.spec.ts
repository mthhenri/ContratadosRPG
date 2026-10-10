import { TestBed } from "@angular/core/testing";
import { RegrasAmplificadoresRender } from "./regras-amplificadores.component";

describe("RegrasAmplificadoresRender", () => {
    it("desenha o empilhamento de cada amplificador com o primitivo", () => {
        const fixture = TestBed.createComponent(RegrasAmplificadoresRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "amplificadores", cabecalho: [], linhas: [], itens: [
                { nome: "Veloz", empilhamento: "■■□□", efeito: [{ tipo: "texto", texto: "+3 metros" }] },
            ],
        });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        expect(raiz.querySelector(".regras-modificacoes__nome")?.textContent).toBe("Veloz");
        expect(raiz.querySelectorAll(".empilhamento__caixa--inicial").length).toBe(2);
        expect(raiz.querySelectorAll(".empilhamento__caixa--vazio").length).toBe(2);
        expect(raiz.textContent).toContain("+3 metros");
    });
});
