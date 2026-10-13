import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { OficinaStore } from "../oficina/oficina.store";
import { RegrasBloco, RegrasTrecho } from "../regras.model";
import { RegrasLista } from "./regras-lista.component";

type Lista = Extract<RegrasBloco, { tipo: "lista" }>;

const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
const paragrafo = (valor: string) => ({ tipo: "paragrafo" as const, trechos: texto(valor) });
const sublista: Lista = { tipo: "lista", ordenada: false, inicio: 1, itens: [[paragrafo("Filho")]] };
const itens: Lista["itens"] = [[paragrafo("Primeiro")], [paragrafo("Segundo"), sublista]];

describe("RegrasLista", () => {
    function montar(opcoes: { oficina?: boolean; selecionada?: boolean } = {}) {
        const dados = { ordenada: true, inicio: 1, itens };
        const store = {
            estado: signal("ok"),
            selecionada: signal<string | null>(opcoes.selecionada ? "peca-1" : null),
            pedidoFoco: signal(null),
            item: vi.fn(() => ({ dados })),
            alterarCampo: vi.fn(),
            pedirFoco: vi.fn(),
            selecionar: vi.fn(),
            ehParagrafo: vi.fn(() => false),
        };
        if (opcoes.oficina !== false) TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
        const fixture = TestBed.createComponent(RegrasLista);
        fixture.componentRef.setInput("bloco", { tipo: "lista", peca: opcoes.oficina === false ? undefined : "peca-1",
            ordenada: true, inicio: 1, itens } satisfies Lista);
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        return { fixture, raiz, store };
    }

    it("fora da Oficina só lê: itens e sublista, sem campos nem botões", () => {
        const { raiz } = montar({ oficina: false });
        expect(raiz.querySelectorAll("ol > li").length).toBe(2);
        expect(raiz.querySelectorAll("ul > li").length).toBe(1);
        expect(raiz.textContent).toContain("Filho");
        expect(raiz.querySelector("app-oficina-texto")).toBeNull();
        expect(raiz.querySelector("button")).toBeNull();
    });

    it("na Oficina cada parágrafo de item é um campo no caminho do dados, sublista inclusive", () => {
        const { raiz } = montar();
        const campos = Array.from(raiz.querySelectorAll("app-oficina-texto")).map((campo) => campo.getAttribute("data-campo"));
        expect(campos).toEqual(["itens.0.0.trechos", "itens.1.0.trechos", "itens.1.1.itens.0.0.trechos"]);
        expect(raiz.querySelector("button")).toBeNull();
    });

    it("selecionada: + Item acrescenta um item vazio no fim e pede o foco nele", () => {
        const { fixture, raiz, store } = montar({ selecionada: true });
        // O botão da lista raiz é o último no DOM: o da sublista vem antes, dentro do item.
        Array.from(raiz.querySelectorAll<HTMLButtonElement>('[aria-label="Adicionar item"]')).at(-1)!.click();
        fixture.detectChanges();
        expect(store.alterarCampo).toHaveBeenCalledWith(
            "peca-1", ["itens"], [...itens, [{ tipo: "paragrafo", trechos: [] }]], "Adicionar item", false);
        expect(store.pedirFoco).toHaveBeenCalledWith({ identificador: "peca-1", campo: "itens.2.0.trechos", posicao: "inicio" });
    });

    it("selecionada: remover item tira só aquele item", () => {
        const { raiz, store } = montar({ selecionada: true });
        raiz.querySelector<HTMLButtonElement>('[aria-label="Remover item 1"]')!.click();
        expect(store.alterarCampo).toHaveBeenCalledWith("peca-1", ["itens"], [itens[1]], "Remover item", false);
    });

    it("a sublista grava no caminho dela, com a peça da lista raiz", () => {
        const { raiz, store } = montar({ selecionada: true });
        const adicionar = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[aria-label="Adicionar item"]'));
        expect(adicionar.length).toBe(2);
        adicionar[0].click();
        expect(store.alterarCampo).toHaveBeenCalledWith(
            "peca-1", ["itens", 1, 1, "itens"], [[paragrafo("Filho")], [{ tipo: "paragrafo", trechos: [] }]], "Adicionar item", false);
    });

    it("selecionada: + Sublista põe uma sublista de marcadores no item e remover sublista a tira", () => {
        const { raiz, store } = montar({ selecionada: true });
        raiz.querySelector<HTMLButtonElement>('[aria-label="Adicionar sublista ao item 1"]')!.click();
        expect(store.alterarCampo).toHaveBeenCalledWith("peca-1", ["itens"], [
            [paragrafo("Primeiro"), { tipo: "lista", ordenada: false, inicio: 1, itens: [[{ tipo: "paragrafo", trechos: [] }]] }],
            itens[1],
        ], "Adicionar sublista", false);
        expect(store.pedirFoco).toHaveBeenCalledWith({
            identificador: "peca-1", campo: "itens.0.1.itens.0.0.trechos", posicao: "inicio",
        });
        raiz.querySelector<HTMLButtonElement>('[aria-label="Remover sublista"]')!.click();
        expect(store.alterarCampo).toHaveBeenLastCalledWith("peca-1", ["itens", 1], [paragrafo("Segundo")], "Remover sublista", false);
        // A lista raiz não tem de onde sair.
        expect(raiz.querySelectorAll('[aria-label="Remover sublista"]')).toHaveLength(1);
    });
});
