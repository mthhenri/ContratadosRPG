import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasGradeReferencia } from "./regras-grade-referencia.component";
import { RegrasIdentidade } from "./regras-identidade.component";

const texto = (valor: string) => [{ tipo: "texto" as const, texto: valor }];

function armazem(selecionada: string | null, dados: object) {
    const store = {
        estado: signal("ok"), selecionada: signal(selecionada), pedidoFoco: signal(null),
        item: vi.fn(() => ({ dados })), alterarCampo: vi.fn(), pedirFoco: vi.fn(),
        selecionar: vi.fn(), ehParagrafo: vi.fn(() => false),
    };
    TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
    return store;
}

describe("grade de saúde na Oficina", () => {
    const itens = [
        { rotulo: "Vida", conteudo: texto("10"), variante: "vida" as const, nota: "base" },
        { rotulo: "Energia", conteudo: texto("5"), variante: "energia" as const },
    ];

    function montar(selecionada: string | null) {
        const store = armazem(selecionada, { itens });
        const fixture = TestBed.createComponent(RegrasGradeReferencia);
        fixture.componentRef.setInput("referencia", { tipo: "saude", itens });
        fixture.componentRef.setInput("peca", "G1");
        fixture.detectChanges();
        return { raiz: fixture.nativeElement as HTMLElement, store };
    }

    it("título e nota de cada item são campos no caminho; Vida/Energia só com a grade selecionada", () => {
        const { raiz } = montar(null);
        expect(Array.from(raiz.querySelectorAll("app-oficina-texto")).map((c) => c.getAttribute("data-campo")))
            .toEqual(expect.arrayContaining(["itens.0.rotulo", "itens.0.nota", "itens.1.rotulo", "itens.1.nota"]));
        expect(raiz.querySelector("app-segmentado")).toBeNull();
    });

    it("selecionada: troca o recurso do item no caminho; o mesmo valor não grava", () => {
        const { raiz, store } = montar("G1");
        const grupos = raiz.querySelectorAll("app-segmentado");
        expect(grupos).toHaveLength(2);
        const [vida, energia] = Array.from(grupos[1].querySelectorAll<HTMLButtonElement>("button"));
        energia.click();
        vida.click();
        expect(store.alterarCampo).toHaveBeenCalledTimes(1);
        expect(store.alterarCampo).toHaveBeenCalledWith("G1", ["itens", 1, "variante"], "vida", "Recurso do item", false);
    });
});

describe("identidade da ficha de criatura na Oficina", () => {
    const campos = [{ rotulo: "Conceito", valor: texto("Fera") }, { rotulo: "Habitat", valor: texto("Floresta") }];

    it("renomeia os campos, menos o Conceito (o cabeçalho da ficha o procura por esse nome)", () => {
        armazem(null, { identidade: campos });
        const fixture = TestBed.createComponent(RegrasIdentidade);
        fixture.componentRef.setInput("bloco", { tipo: "identidade", cabecalho: [], linhas: [], campos });
        fixture.componentRef.setInput("peca", "F1");
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const rotulos = Array.from(raiz.querySelectorAll("app-oficina-texto")).map((c) => c.getAttribute("data-campo"));
        expect(rotulos).toContain("identidade.1.rotulo");
        expect(rotulos).not.toContain("identidade.0.rotulo");
        expect(raiz.querySelector("dt")!.textContent).toContain("Conceito");
    });
});
