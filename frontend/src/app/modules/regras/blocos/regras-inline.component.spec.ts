import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { RegrasInline } from "./regras-inline.component";
import { RegrasTrecho } from "../regras.model";

describe("condições no texto das Regras", () => {
    it("explica condições em texto e negrito preservando a leitura e a cor dos recursos", () => {
        TestBed.configureTestingModule({ imports: [RegrasInline] });
        const fixture = TestBed.createComponent(RegrasInline);
        const trechos: RegrasTrecho[] = [
            { tipo: "texto", texto: "Perde Vida e fica " },
            { tipo: "negrito", filhos: [{ tipo: "texto", texto: "Morrendo" }] },
            { tipo: "texto", texto: "; Inconsciente reduz Energia." },
        ];
        fixture.componentRef.setInput("trechos", trechos);
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        expect(raiz.textContent).toBe("Perde Vida e fica Morrendo; Inconsciente reduz Energia.");
        expect(raiz.querySelectorAll(".regras-inline__recurso").length).toBe(2);
        const dicas = fixture.debugElement.queryAll(By.directive(Tooltip));
        expect(dicas.length).toBe(2);
        expect(dicas[0].injector.get(Tooltip).appTooltip()).toContain("Medicina");
        expect(dicas[1].injector.get(Tooltip).appTooltip()).toContain("Vulnerável");
        expect(dicas.every((dica) => dica.nativeElement.tabIndex === 0)).toBe(true);
        expect(dicas.every((dica) => dica.nativeElement.style.textDecoration.includes('dotted'))).toBe(true);
    });

    it("explica o link de condição sem retirar a navegação normal ou com modificador", () => {
        TestBed.configureTestingModule({ imports: [RegrasInline] });
        const fixture = TestBed.createComponent(RegrasInline);
        fixture.componentRef.setInput("trechos", [
            { tipo: "link-interno", texto: "Morrendo", ancora: "morrendo" },
        ]);
        fixture.detectChanges();
        const destinos: string[] = [];
        fixture.componentInstance.navegarAncora.subscribe((ancora) => destinos.push(ancora));
        const link = fixture.nativeElement.querySelector("a") as HTMLAnchorElement;
        expect(link.style.textDecoration).toContain("dotted");
        const clique = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clique);
        expect(destinos).toEqual(["morrendo"]);
        expect(clique.defaultPrevented).toBe(true);
        expect(link.getAttribute("href")).toBe("/regras/sistema#morrendo");
        const modificado = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
        link.dispatchEvent(modificado);
        expect(modificado.defaultPrevented).toBe(false);
        expect(destinos.length).toBe(1);
        expect(fixture.debugElement.query(By.directive(Tooltip))
            .injector.get(Tooltip).appTooltip()).toContain("DT Base 5 + 5 por turno");
    });
});
