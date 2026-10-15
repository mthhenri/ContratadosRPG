import { TestBed } from "@angular/core/testing";
import { RegrasHabilidade } from "./regras-habilidade.component";
import type { RegrasBloco } from "../regras.model";

type Habilidade = Extract<RegrasBloco, { tipo: "habilidade" }>;

describe("bloco de habilidade das Regras", () => {
    function montar(custo: Habilidade["custo"]): HTMLElement {
        TestBed.configureTestingModule({ imports: [RegrasHabilidade] });
        const fixture = TestBed.createComponent(RegrasHabilidade);
        fixture.componentRef.setInput("bloco", {
            tipo: "habilidade", nome: "Treinamento de Campo [Ex.: Segunda Natureza]", custo, reacao: false,
            glifo: null, trechos: [{ tipo: "texto", texto: "Passiva — Ignora penalidades de movimento." }],
        } satisfies Habilidade);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it("passiva (custo nulo) mostra nome, tipo e efeito sem selo de Energia nem 0 inventado", () => {
        const raiz = montar(null);
        expect(raiz.querySelector(".regras-habilidade__nome")?.textContent).toContain("Treinamento de Campo [Ex.: Segunda Natureza]");
        expect(raiz.querySelector("p")?.textContent).toContain("Passiva — Ignora penalidades de movimento.");
        expect(raiz.querySelector("app-chip")).toBeNull();
        expect(raiz.textContent).not.toContain("0");
    });

    it("ativa continua com o selo de custo de Energia", () => {
        const raiz = montar(4);
        expect(raiz.querySelector("app-chip")?.textContent).toContain("4");
    });
});
