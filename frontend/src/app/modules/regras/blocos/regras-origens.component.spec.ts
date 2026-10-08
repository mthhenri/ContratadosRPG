import { TestBed } from "@angular/core/testing";
import { RegrasOrigens } from "./regras-origens.component";
import { RegrasTrecho } from "../regras.model";
const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
describe("RegrasOrigens", () => {
    it("renderiza todos os campos de cada origem em cartões sem a tabela fonte", () => {
        const fixture = TestBed.createComponent(RegrasOrigens);
        fixture.componentRef.setInput("bloco", { tipo: "origens", cabecalho: [texto("FONTE")], linhas: [],
            origens: ["Bombeiro", "Alpinista"].map(nome => ({ nome, citacao: texto("Citação " + nome),
                formacao: texto("Formação " + nome), especialidade: texto("Especialidade " + nome),
                saberCampo: texto("Saber " + nome) })),
        });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        const cartoes = raiz.querySelectorAll("app-cartao");
        expect(cartoes.length).toBe(2);
        ["Bombeiro", "Alpinista"].forEach((nome, indice) => {
            ["Citação", "Formação", "Especialidade", "Saber"].forEach(campo =>
                expect(cartoes[indice].textContent).toContain(campo + " " + nome));
        });
        expect(raiz.textContent).not.toContain("FONTE");
        expect(raiz.querySelector("table")).toBeNull();
    });
});
