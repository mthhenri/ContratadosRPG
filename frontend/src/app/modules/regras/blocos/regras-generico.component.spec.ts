import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasGenerico } from "./regras-generico.component";

describe("RegrasGenerico", () => {
    function montar(oficina: boolean) {
        if (oficina) {
            TestBed.configureTestingModule({
                providers: [{
                    provide: OficinaStore,
                    useValue: { estado: signal("ok"), selecionada: signal(null), pedidoFoco: signal(null),
                        item: vi.fn(), selecionar: vi.fn(), ehParagrafo: vi.fn(() => false) },
                }],
            });
        }
        const fixture = TestBed.createComponent(RegrasGenerico);
        fixture.componentRef.setInput("bloco", { tipo: "generico", peca: oficina ? "G1" : undefined,
            motivo: "bloco sem tipo", trechos: [{ tipo: "texto", texto: "Solto." }], origemMarkdown: "" });
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it("fora da Oficina só lê, sem a nota", () => {
        const raiz = montar(false);
        expect(raiz.querySelector("app-oficina-texto")).toBeNull();
        expect(raiz.textContent).toContain("Solto.");
        expect(raiz.textContent).not.toContain("importação");
    });

    it("na Oficina edita os trechos e mostra o motivo como nota somente leitura", () => {
        const raiz = montar(true);
        expect(raiz.querySelector("app-oficina-texto")?.getAttribute("data-campo")).toBe("trechos");
        expect(raiz.querySelector(".regras-generico__nota")?.textContent).toContain("bloco sem tipo");
    });
});
