import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { TipoRegraPecaEnum as T } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";

import { OficinaInsercao } from "./oficina-insercao.component";
import { OficinaStore } from "./oficina.store";

describe("OficinaInsercao", () => {
    function montar(entradas: { pai: string | null; restritoA?: T[]; estado?: string }, tipoDoPai: T | null = null) {
        const store = {
            estado: signal(entradas.estado ?? "ok"),
            itens: signal([]),
            selecionada: signal<string | null>(null),
            item: vi.fn(() => (tipoDoPai === null ? undefined : { tipo: tipoDoPai })),
            inserir: vi.fn().mockResolvedValue(undefined),
        };
        TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
        const fixture = TestBed.createComponent(OficinaInsercao);
        fixture.componentRef.setInput("pai", entradas.pai);
        fixture.componentRef.setInput("depoisDe", "p-2");
        if (entradas.restritoA) fixture.componentRef.setInput("restritoA", entradas.restritoA);
        fixture.detectChanges();
        const raiz = fixture.nativeElement as HTMLElement;
        const gatilho = () => raiz.querySelector<HTMLButtonElement>(".oficina-insercao__botao");
        const rotulos = () =>
            Array.from(raiz.querySelectorAll(".menu-insercao__rotulo")).map((elemento) => elemento.textContent?.trim());
        return { fixture, raiz, store, gatilho, rotulos };
    }

    it("na raiz do livro oferece seção e blocos, mas não arquétipo", () => {
        const { fixture, gatilho, rotulos } = montar({ pai: null });
        gatilho()!.click();
        fixture.detectChanges();
        expect(rotulos()).toContain("Seção");
        expect(rotulos()).toContain("Parágrafo");
        expect(rotulos()).toContain("Lista");
        expect(rotulos()).not.toContain("Arquétipo");
    });

    it("dentro de uma classe só oferece habilidade e arquétipo", () => {
        const { fixture, gatilho, rotulos } = montar({ pai: "p-1" }, T.CLASSE);
        gatilho()!.click();
        fixture.detectChanges();
        expect(rotulos()).toEqual(["Habilidade", "Arquétipo"]);
    });

    it("restrito a arquétipo, o menu oferece só ele (o + Arquétipo da classe)", () => {
        const { fixture, gatilho, rotulos } = montar({ pai: "p-1", restritoA: [T.ARQUETIPO] }, T.CLASSE);
        expect(gatilho()!.textContent).toContain("Inserir");
        gatilho()!.click();
        fixture.detectChanges();
        expect(rotulos()).toEqual(["Arquétipo"]);
    });

    it("escolher uma opção pede ao store para inserir naquele ponto e fecha o menu", () => {
        const { fixture, raiz, store, gatilho } = montar({ pai: "p-1" }, T.SECAO);
        gatilho()!.click();
        fixture.detectChanges();
        raiz.querySelector<HTMLElement>('[role="option"]:nth-child(2)')!.click();
        fixture.detectChanges();
        expect(store.inserir).toHaveBeenCalledWith(T.SECAO, "p-1", "p-2", undefined, false);
        expect(raiz.querySelector(".menu-insercao")).toBeNull();
    });

    it("não aparece fora da Oficina nem onde nada cabe", () => {
        expect(montar({ pai: null, estado: "inativo" }).gatilho()).toBeNull();
        TestBed.resetTestingModule();
        expect(montar({ pai: "p-1" }, T.PARAGRAFO).gatilho()).toBeNull();
    });
});
