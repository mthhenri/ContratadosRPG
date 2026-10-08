import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { RegrasModulosRender } from "./regras-modulos.component";

describe("RegrasModulosRender", () => {
    it("apresenta V a I e explica a reserva de Energia Máxima até retirar o fragmento", () => {
        const fixture = TestBed.createComponent(RegrasModulosRender);
        fixture.componentRef.setInput("bloco", {
            tipo: "modulos", cabecalho: [], linhas: [], modulos: [
                { nivel: "V", energiaMaxima: 3 }, { nivel: "IV", energiaMaxima: 7 },
                { nivel: "III", energiaMaxima: 12 }, { nivel: "II", energiaMaxima: 16 },
                { nivel: "I", energiaMaxima: 20 },
            ],
        });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        expect(Array.from(raiz.querySelectorAll(".regras-modulos__nivel"))
            .map(elemento => elemento.textContent?.trim())).toEqual(["V", "IV", "III", "II", "I"]);
        expect(raiz.querySelectorAll("app-cartao").length).toBe(5);
        const dicas = fixture.debugElement.queryAll(By.directive(Tooltip));
        expect(dicas.length).toBe(5);
        expect(dicas[0].injector.get(Tooltip).appTooltip()).toContain("3 de Energia Máxima");
        expect(dicas[0].injector.get(Tooltip).appTooltip()).toContain("retirar o fragmento");
        expect(raiz.textContent).toContain("← mais fraco");
        expect(raiz.textContent).toContain("mais forte →");
    });
});
