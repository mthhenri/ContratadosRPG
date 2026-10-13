import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasAbertura } from "./regras-abertura.component";
import { RegrasTrecho } from "../regras.model";

describe("Abertura dos livros", () => {
    it("separa parágrafos sem perder tarjas, negritos e pausas internas", () => {
        const trechos: RegrasTrecho[] = [
            { tipo: "italico", filhos: [
                { tipo: "texto", texto: "Autorização " },
                { tipo: "tarja", comprimento: 8 },
            ] },
            { tipo: "texto", texto: "\n\n" },
            { tipo: "italico", filhos: [
                { tipo: "texto", texto: "Você não erra.\n" },
                { tipo: "negrito", filhos: [{ tipo: "texto", texto: "Você escreve." }] },
            ] },
            { tipo: "texto", texto: "\n\n" },
            { tipo: "italico", filhos: [{ tipo: "texto", texto: "Você tem nossa confiança." }] },
        ];
        const fixture = TestBed.createComponent(RegrasAbertura);
        fixture.componentRef.setInput("bloco", { tipo: "abertura", titulo: "Registro", trechos });
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const paragrafos = raiz.querySelectorAll(".regras-abertura__texto");
        expect(paragrafos).toHaveLength(3);
        expect(paragrafos[0].querySelector('[aria-label="Trecho censurado"]')).not.toBeNull();
        expect(paragrafos[1].textContent).toContain("Você não erra.\nVocê escreve.");
        expect(paragrafos[1].querySelector("strong")?.textContent).toBe("Você escreve.");
        expect(raiz.querySelector("em")).toBeNull();
        expect(paragrafos[2].classList.contains("regras-abertura__texto--fechamento")).toBe(true);
    });
});

describe("Abertura na Oficina", () => {
    const trechos: RegrasTrecho[] = [{ tipo: "italico", filhos: [{ tipo: "texto", texto: "Um.\n\nDois." }] }];

    function montar(oficina: boolean) {
        if (oficina) {
            TestBed.configureTestingModule({
                providers: [{
                    provide: OficinaStore,
                    useValue: {
                        estado: signal("ok"), selecionada: signal(null), pedidoFoco: signal(null),
                        item: vi.fn(() => ({ dados: { titulo: "Registro", trechos, selo: "VERSÃO 4.1.4" } })),
                        selecionar: vi.fn(), ehParagrafo: vi.fn(() => false),
                    },
                }],
            });
        }
        const fixture = TestBed.createComponent(RegrasAbertura);
        fixture.componentRef.setInput("bloco", { tipo: "abertura", peca: oficina ? "A1" : undefined, titulo: "Registro", trechos });
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it("fora da Oficina só lê", () => {
        const raiz = montar(false);
        expect(raiz.querySelector("app-oficina-texto")).toBeNull();
        expect(raiz.querySelectorAll(".regras-abertura__texto")).toHaveLength(2);
    });

    it("edita título, trechos originais (com o itálico externo) e selo da capa", () => {
        const raiz = montar(true);
        const campos = Array.from(raiz.querySelectorAll("app-oficina-texto"));
        expect(campos.map((campo) => campo.getAttribute("data-campo"))).toEqual(["titulo", "trechos", "selo"]);
        expect(campos[0].textContent).toBe("Registro");
        expect(campos[1].querySelector("em")?.textContent).toBe("Um.\n\nDois.");
        expect(campos[2].textContent).toBe("VERSÃO 4.1.4");
    });
});
