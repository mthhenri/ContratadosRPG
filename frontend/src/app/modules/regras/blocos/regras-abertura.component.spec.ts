import { TestBed } from "@angular/core/testing";
import { RegrasAbertura } from "./regras-abertura.component";
import { RegrasTrecho } from "../regras.model";

describe("Abertura dos livros", () => {
    it("separa parágrafos sem perder tarjas, negritos e pausas internas", () => {
        const trechos: RegrasTrecho[] = [
            { tipo: "italico", filhos: [
                { tipo: "texto", texto: "Autorização " },
                { tipo: "tarja", comprimento: 8 },
            ] },
            { tipo: "texto", texto: "\n\n" },
            { tipo: "italico", filhos: [
                { tipo: "texto", texto: "Você não erra.\n" },
                { tipo: "negrito", filhos: [{ tipo: "texto", texto: "Você escreve." }] },
            ] },
            { tipo: "texto", texto: "\n\n" },
            { tipo: "italico", filhos: [{ tipo: "texto", texto: "Você tem nossa confiança." }] },
        ];
        const fixture = TestBed.createComponent(RegrasAbertura);
        fixture.componentRef.setInput("bloco", { tipo: "abertura", titulo: "Registro", trechos });
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const paragrafos = raiz.querySelectorAll(".regras-abertura__texto");
        expect(paragrafos).toHaveLength(3);
        expect(paragrafos[0].querySelector('[aria-label="Trecho censurado"]')).not.toBeNull();
        expect(paragrafos[1].textContent).toContain("Você não erra.\nVocê escreve.");
        expect(paragrafos[1].querySelector("strong")?.textContent).toBe("Você escreve.");
        expect(raiz.querySelector("em")).toBeNull();
        expect(paragrafos[2].classList.contains("regras-abertura__texto--fechamento")).toBe(true);
    });
});
