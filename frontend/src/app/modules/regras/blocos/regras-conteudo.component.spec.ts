import { TestBed } from "@angular/core/testing";
import { RegrasConteudo } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";

describe("RegrasConteudoRender", () => {
    it("preserva espaços e pontuação nas fronteiras dos trechos", () => {
        const fixture = renderizar([{ tipo: "paragrafo", trechos: [
            { tipo: "texto", texto: "Seu " },
            { tipo: "negrito", filhos: [{ tipo: "texto", texto: "Vigor" }] },
            { tipo: "texto", texto: ". Aumenta sua vida." },
        ] }]);
        expect(fixture.nativeElement.querySelector("p").textContent)
            .toBe("Seu Vigor. Aumenta sua vida.");
    });
    function renderizar(filhos: readonly RegrasConteudo[]) {
        const fixture = TestBed.createComponent(RegrasConteudoRender);
        fixture.componentRef.setInput("filhos", filhos);
        fixture.componentRef.setInput("documento", "guia");
        fixture.detectChanges();
        return fixture;
    }

    it("renderiza texto como texto, com ênfase recursiva e tarja acessível", () => {
        const fixture = renderizar([{ tipo: "paragrafo", trechos: [
            { tipo: "texto", texto: "<script>perigo()</script>" },
            { tipo: "negrito", filhos: [
                { tipo: "italico", filhos: [{ tipo: "texto", texto: "Ênfase" }] },
            ] },
            { tipo: "tarja", comprimento: 5 },
        ] }]);
        const raiz: HTMLElement = fixture.nativeElement;
        expect(raiz.querySelector("script")).toBeNull();
        expect(raiz.textContent).toContain("<script>perigo()</script>");
        expect(raiz.querySelector("strong em")?.textContent).toContain("Ênfase");
        expect(raiz.querySelector('[aria-label="Trecho censurado"]')).not.toBeNull();
    });

    it("propaga navegação interna e conserva href e clique modificado", () => {
        const fixture = renderizar([{ tipo: "paragrafo", trechos: [
            { tipo: "link-interno", ancora: "vida", texto: "Vida" },
            { tipo: "link-externo", destino: "https://example.org",
                filhos: [{ tipo: "texto", texto: "Fonte" }] },
        ] }]);
        const ancora = fixture.nativeElement.querySelector("a") as HTMLAnchorElement;
        const navegar = vi.fn();
        fixture.componentInstance.navegarAncora.subscribe(navegar);
        expect(ancora.getAttribute("href")).toBe("/regras/guia#vida");
        ancora.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        expect(navegar).toHaveBeenCalledWith("vida");
        navegar.mockClear();
        const modificado = new MouseEvent("click", {
            bubbles: true, cancelable: true, ctrlKey: true,
        });
        ancora.dispatchEvent(modificado);
        expect(navegar).not.toHaveBeenCalled();
        expect(modificado.defaultPrevented).toBe(false);
        const externo = fixture.nativeElement.querySelector('a[target="_blank"]');
        expect(externo.rel).toBe("noopener noreferrer");
    });

    it("renderiza seção, lista, habilidade e tabela sem perder células vazias", () => {
        const fixture = renderizar([{
            tipo: "secao", nivel: 2, glifo: "⬡", titulo: "Vida", ancora: "vida", filhos: [
            { tipo: "lista", ordenada: true, inicio: 3, itens: [[{
                tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Recuperação" }],
            }]] },
            { tipo: "habilidade", nome: "Bloquear", custo: "X", reacao: true, glifo: "◈",
                trechos: [{ tipo: "texto", texto: "Reduz dano" }] },
            { tipo: "tabela", cabecalho: [[{ tipo: "texto", texto: "Valor" }], []],
                linhas: [[[{ tipo: "texto", texto: "5" }], []]] },
        ] }]);
        const raiz: HTMLElement = fixture.nativeElement;
        expect(raiz.querySelector('[id="vida"][data-ancora-regras]')).not.toBeNull();
        expect(raiz.querySelector("ol")?.start).toBe(3);
        expect(raiz.querySelectorAll("app-chip").length).toBe(2);
        expect(raiz.querySelector('[aria-label="X de Energia"]')).not.toBeNull();
        expect(raiz.querySelector('app-icone[nome="energia"]')).not.toBeNull();
        expect(raiz.textContent).toContain("REAÇÃO");
        expect(raiz.querySelectorAll("tbody td").length).toBe(2);
    });

    it("renderiza dados ricos tipados e preserva filhos do genérico", () => {
        const fixture = renderizar([
            { tipo: "modulos", modulos: [{ nivel: "V", energiaMaxima: 3 }],
                cabecalho: [[{ tipo: "texto", texto: "Módulo" }]],
                linhas: [[[{ tipo: "texto", texto: "V" }]]] },
            { tipo: "generico", motivo: "Fonte", origemMarkdown: "", trechos: [], filhos: [
                { tipo: "nota", trechos: [{ tipo: "texto", texto: "Observação preservada" }] },
            ] },
        ]);
        expect(fixture.nativeElement.textContent).toContain("Módulo");
        expect(fixture.nativeElement.textContent).toContain("V");
        expect(fixture.nativeElement.textContent).toContain("Observação preservada");
    });
});
