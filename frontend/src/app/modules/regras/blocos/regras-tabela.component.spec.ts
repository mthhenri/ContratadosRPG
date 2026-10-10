import { TestBed } from "@angular/core/testing";
import { RegrasTrecho } from "../regras.model";
import { RegrasTabela } from "./regras-tabela.component";

describe("RegrasTabela — pares independentes", () => {
    const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];

    it("apresenta cada chave junto do valor projetado, sem repetir a fonte", () => {
        const fixture = TestBed.createComponent(RegrasTabela);
        fixture.componentRef.setInput("bloco", {
            cabecalho: [texto("Nível"), texto("Bônus"), texto("Nível"), texto("Bônus")],
            linhas: [[texto("00"), texto("INICIAL"), texto("11"), texto("+1 Atributo")]],
            pares: { cabecalho: [texto("Nível"), texto("Bônus")],
                linhas: [[texto("00"), texto("INICIAL")],
                    [texto("11"), texto("+1 Atributo")], [texto("12"), []]] },
        });
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        expect(Array.from(raiz.querySelectorAll("tbody tr")).map(linha =>
            Array.from(linha.querySelectorAll("td")).map(celula => celula.textContent)))
            .toEqual([["00", "INICIAL"], ["11", "+1 Atributo"], ["12", ""]]);
        expect(raiz.querySelectorAll("th")).toHaveLength(2);
        expect(raiz.querySelector(".regras-tabela")?.getAttribute("style"))
            .toContain("--regras-tabela-colunas: 2");
    });
});
