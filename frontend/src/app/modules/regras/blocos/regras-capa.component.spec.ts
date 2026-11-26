import { TestBed } from "@angular/core/testing";
import { RegrasCapa } from "./regras-capa.component";

describe("Capa do leitor de Regras", () => {
    function renderizar(subtitulo: string) {
        const fixture = TestBed.createComponent(RegrasCapa);
        fixture.componentRef.setInput("bloco", { tipo: "capa", titulo: "Contratados", subtitulo });
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it("mostra o subtítulo quando o livro tem um", () => {
        expect(renderizar("- Nova Era -").querySelector(".regras-capa__subtitulo")?.textContent)
            .toContain("- Nova Era -");
    });

    it("não desenha a linha do subtítulo quando ele é vazio", () => {
        expect(renderizar("").querySelector(".regras-capa__subtitulo")).toBeNull();
    });
});
