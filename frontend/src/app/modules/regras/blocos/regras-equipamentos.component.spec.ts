import { TestBed } from "@angular/core/testing";
import { RegrasEquipamentos, RegrasTrecho } from "../regras.model";
import { RegrasEquipamentosRender } from "./regras-equipamentos.component";

describe("RegrasEquipamentosRender", () => {
    it("preserva os dois danos rotulados, porte, peso zero e detalhes adicionais", () => {
        const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
        const bloco: RegrasEquipamentos = {
            tipo: "equipamentos", categoria: "Corpo a Corpo", cabecalho: [], linhas: [],
            itens: [{
                nome: "Arma", custo: texto("$ 250"), peso: texto("0"),
                porte: texto("Uma Mão ou Duas Mãos"), descricao: texto("Descrição curta"),
                danos: [
                    { rotulo: "UMA MÃO", trechos: texto("1D3 [Físico]") },
                    { rotulo: "DUAS MÃOS", trechos: texto("1D6 [Físico]") },
                ],
                especificacoes: texto("Alcance: Curto"), duracao: texto("3 cenas"),
            }],
        };
        const fixture = TestBed.createComponent(RegrasEquipamentosRender);
        fixture.componentRef.setInput("bloco", bloco);
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        expect(raiz.querySelector("table")).toBeNull();
        expect(raiz.querySelectorAll("app-chip").length).toBe(4);
        for (const trecho of ["UMA MÃO", "DUAS MÃOS", "1D3", "1D6", "PESO · 0",
            "Alcance: Curto", "3 cenas", "$ 250"]) {
            expect(raiz.textContent).toContain(trecho);
        }
    });

    it("mantém os links da fonte navegáveis no documento recebido", () => {
        const fixture = TestBed.createComponent(RegrasEquipamentosRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "equipamentos", categoria: "Equipamentos", cabecalho: [], linhas: [],
            itens: [{ nome: "Corpo", custo: [], peso: [], danos: [], descricao: [
                { tipo: "link-interno", ancora: "corpo", texto: "Regra de Corpo" },
            ] }],
        });
        fixture.componentRef.setInput("documento", "guia");
        fixture.detectChanges();
        const navegar = vi.fn();
        fixture.componentInstance.navegarAncora.subscribe(navegar);
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector("a");
        expect(link.getAttribute("href")).toBe("/regras/guia#corpo");
        link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        expect(navegar).toHaveBeenCalledWith("corpo");
    });
});
