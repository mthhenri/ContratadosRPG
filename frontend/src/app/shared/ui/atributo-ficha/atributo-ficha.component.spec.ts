import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Tooltip } from "../../tooltip/tooltip.directive";
import { AtributoFicha } from "./atributo-ficha.component";

@Component({
    imports: [AtributoFicha],
    template: `<app-atributo-ficha sigla="DES" nome="Destreza" [valor]="0" [dt]="12"
        [editando]="true"><span atributoValor>Valor</span>
        <span atributoModificador>Modificador</span><span atributoDados>Dados</span>
        </app-atributo-ficha>`,
})
class HospedeiroEdicao {}

describe("AtributoFicha", () => {
    function montar(entradas: Record<string, unknown> = {}) {
        const fixture = TestBed.createComponent(AtributoFicha);
        for (const [nome, valor] of Object.entries({ sigla: "DES", nome: "Destreza", valor: 0,
            dt: 12, maestria: true, lesao: 1, modificador: -2, dados: 3, podeRolar: true,
            dicaLesao: "Base 1 · lesão −1", dicaMaestria: "Requer pontos", ...entradas })) {
            fixture.componentRef.setInput(nome, valor);
        }
        fixture.detectChanges();
        return { fixture, componente: fixture.componentInstance,
            raiz: fixture.nativeElement as HTMLElement };
    }

    it("sigla focável com nome e DT no tooltip/aria-label, zero visível e valores recebidos", () => {
        const { fixture, raiz } = montar();
        const sigla = fixture.debugElement.query(By.css(".ficha-atributo__abrev"));
        expect(sigla.nativeElement.getAttribute("tabindex")).toBe("0");
        expect(sigla.nativeElement.getAttribute("aria-label")).toBe("Destreza — DT 12");
        expect(sigla.injector.get(Tooltip).appTooltip()).toBe("Destreza — DT 12");
        sigla.nativeElement.focus();
        expect(document.activeElement).toBe(sigla.nativeElement);
        expect(raiz.querySelector(".ficha-atributo__valor")?.textContent?.trim()).toBe("0 −1");
        expect(raiz.querySelector(".ficha-atributo__mod-valor")?.textContent).toBe("-2");
        expect(raiz.querySelector(".ficha-atributo__dados-badge")?.textContent).toContain("+3");
        expect(raiz.classList.contains("ficha-atributo--lesionado")).toBe(true);
    });

    it.each([
        ["mostrarMaestria", ".ficha-atributo__estrela"],
        ["mostrarLesao", ".ficha-atributo__lesao"],
        ["mostrarModificador", ".ficha-atributo__mod-valor"],
        ["mostrarDados", ".ficha-atributo__dados-badge"],
        ["mostrarRolar", ".ficha-atributo__rolar"],
    ])("%s desliga sua linha mesmo recebendo valores ativos", (entrada, seletor) => {
        const { raiz } = montar({ [entrada]: false });
        expect(raiz.querySelector(seletor)).toBeNull();
    });

    it("rolar respeita permissão e emite só no clique", () => {
        const { fixture, raiz, componente } = montar();
        const rolar = vi.fn(); componente.rolar.subscribe(rolar);
        raiz.querySelector<HTMLButtonElement>(".ficha-atributo__rolar")!.click();
        expect(rolar).toHaveBeenCalledTimes(1);
        fixture.componentRef.setInput("podeRolar", false); fixture.detectChanges();
        expect(raiz.querySelector(".ficha-atributo__rolar")).toBeNull();
    });

    it("edição alterna Maestria sem calcular elegibilidade e respeita a trava recebida", () => {
        const { fixture, raiz, componente } = montar({ editando: true });
        const alternar = vi.fn(); componente.maestriaAlternada.subscribe(alternar);
        const botao = raiz.querySelector<HTMLButtonElement>(".ficha-atributo__maestria")!;
        botao.click(); expect(alternar).toHaveBeenCalledTimes(1);
        fixture.componentRef.setInput("maestriaHabilitada", false); fixture.detectChanges();
        expect(botao.disabled).toBe(true);
        expect(raiz.querySelector(".ficha-atributo__valor, .ficha-atributo__rolar")).toBeNull();
    });

    it("projeta controles de edição no lugar dos valores", () => {
        const fixture = TestBed.createComponent(HospedeiroEdicao); fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        expect(raiz.querySelector(".ficha-atributo__stepper")?.textContent).toBe("Valor");
        expect(raiz.querySelector(".ficha-atributo__modificador")?.textContent).toContain("Modificador");
        expect(raiz.querySelector(".ficha-atributo__dados")?.textContent).toContain("Dados");
    });

    it("dados zero ocultam badge, modificador zero continua +0", () => {
        const { raiz } = montar({ dados: 0, modificador: 0 });
        expect(raiz.querySelector(".ficha-atributo__dados-badge")).toBeNull();
        expect(raiz.querySelector(".ficha-atributo__mod-valor")?.textContent).toBe("+0");
    });
});
