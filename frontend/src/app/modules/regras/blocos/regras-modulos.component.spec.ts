import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { OficinaStore } from "../oficina/oficina.store";
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

describe("RegrasModulosRender na Oficina", () => {
    const modulos = [{ nivel: "V", energiaMaxima: 3 }, { nivel: "IV", energiaMaxima: 7 }];

    function montar(selecionada: boolean) {
        const store = {
            estado: signal("ok"), selecionada: signal(selecionada ? "M1" : null), pedidoFoco: signal(null),
            item: vi.fn(() => ({ dados: { modulos } })), alterarCampo: vi.fn(), pedirFoco: vi.fn(),
            selecionar: vi.fn(), ehParagrafo: vi.fn(() => false),
        };
        TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
        const fixture = TestBed.createComponent(RegrasModulosRender);
        fixture.componentRef.setInput("bloco", { tipo: "modulos", peca: "M1", cabecalho: [], linhas: [], modulos });
        fixture.detectChanges();
        return { fixture, raiz: fixture.nativeElement as HTMLElement, store };
    }

    it("nível é campo no caminho e Energia Máxima é stepper; sem seleção não há remover nem adicionar", () => {
        const { raiz } = montar(false);
        expect(Array.from(raiz.querySelectorAll("app-oficina-texto")).map((c) => c.getAttribute("data-campo")))
            .toEqual(["modulos.0.nivel", "modulos.1.nivel"]);
        expect(raiz.querySelectorAll("app-step-input")).toHaveLength(2);
        expect(raiz.querySelector("button[aria-label^=Remover]")).toBeNull();
        expect(raiz.querySelector("button[aria-label=\"Adicionar módulo\"]")).toBeNull();
    });

    it("grava a Energia Máxima no caminho, recusando negativo e fracionário", () => {
        const { fixture, store } = montar(false);
        const passo = fixture.debugElement.queryAll(By.directive(StepInput))[1].componentInstance as StepInput;
        passo.valorAlterado.emit(9);
        passo.valorAlterado.emit(-1);
        passo.valorAlterado.emit(1.5);
        expect(store.alterarCampo).toHaveBeenCalledTimes(1);
        expect(store.alterarCampo).toHaveBeenCalledWith("M1", ["modulos", 1, "energiaMaxima"], 9,
            "Energia Máxima do módulo", false);
    });

    it("selecionado: adiciona um módulo vazio no fim e remove o escolhido", () => {
        const { raiz, store } = montar(true);
        raiz.querySelector<HTMLButtonElement>("button[aria-label=\"Adicionar módulo\"]")!.click();
        expect(store.alterarCampo).toHaveBeenCalledWith("M1", ["modulos"],
            [...modulos, { nivel: "", energiaMaxima: 0 }], "Adicionar módulo", false);
        expect(store.pedirFoco).toHaveBeenCalledWith({ identificador: "M1", campo: "modulos.2.nivel", posicao: "inicio" });
        raiz.querySelector<HTMLButtonElement>("button[aria-label=\"Remover módulo V\"]")!.click();
        expect(store.alterarCampo).toHaveBeenLastCalledWith("M1", ["modulos"], [modulos[1]], "Remover módulo", false);
    });
});
