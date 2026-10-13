import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { OficinaPropriedades } from "./oficina-propriedades.component";
import { propriedadesDaLista, propriedadesDaPeca } from "./oficina-propriedades";
import { OficinaStore } from "./oficina.store";

const chaves = (propriedades: readonly { chave: string }[]) => propriedades.map((propriedade) => propriedade.chave);

describe("propriedadesDaPeca", () => {
    it("seção: nível e glifo; habilidade solta: só o glifo", () => {
        expect(chaves(propriedadesDaPeca(Tipo.SECAO, { nivel: 2, glifo: null }, null))).toEqual(["nivel", "glifo"]);
        expect(chaves(propriedadesDaPeca(Tipo.HABILIDADE, { glifo: "⬦" }, Tipo.CLASSE))).toEqual(["glifo"]);
    });

    it("habilidade de arquétipo: inicial e geral melhorada; a inicial não é melhorada; subclasse só tem inicial", () => {
        expect(chaves(propriedadesDaPeca(Tipo.HABILIDADE, {}, Tipo.ARQUETIPO))).toEqual(["glifo", "inicial", "melhorada"]);
        expect(chaves(propriedadesDaPeca(Tipo.HABILIDADE, { inicial: true }, Tipo.ARQUETIPO))).toEqual(["glifo", "inicial"]);
        expect(chaves(propriedadesDaPeca(Tipo.HABILIDADE, {}, Tipo.SUBCLASSE))).toEqual(["glifo", "inicial"]);
    });

    it("termos: variante; grade: só saúde e cartões trocam de apresentação", () => {
        expect(chaves(propriedadesDaPeca(Tipo.TERMOS, { variante: "maestrias" }, null))).toEqual(["variante"]);
        expect(chaves(propriedadesDaPeca(Tipo.GRADE, { apresentacao: "saude" }, null))).toEqual(["apresentacao"]);
        expect(propriedadesDaPeca(Tipo.GRADE, { apresentacao: "generica" }, null)).toEqual([]);
    });

    it("tabela em pares só aparece com quatro colunas (ou se já estiver em pares)", () => {
        const colunas = (quantidade: number) => ({ cabecalho: Array.from({ length: quantidade }, () => []) });
        expect(chaves(propriedadesDaPeca(Tipo.TABELA, colunas(4), null))).toEqual(["emPares"]);
        expect(propriedadesDaPeca(Tipo.TABELA, colunas(3), null)).toEqual([]);
        expect(chaves(propriedadesDaPeca(Tipo.TABELA, { ...colunas(3), emPares: true }, null))).toEqual(["emPares"]);
    });

    it("lista: o número inicial só aparece quando numerada, no caminho dela", () => {
        expect(chaves(propriedadesDaLista({ ordenada: false, inicio: 1 }, []))).toEqual(["ordenada"]);
        const numerada = propriedadesDaLista({ ordenada: true, inicio: 3 }, ["itens", 1, 1]);
        expect(chaves(numerada)).toEqual(["ordenada", "inicio"]);
        expect(numerada[1]).toMatchObject({ caminho: ["itens", 1, 1, "inicio"], atual: 3 });
    });
});

describe("OficinaPropriedades", () => {
    const habilidade = (identificador: string, id: number, dados: object) =>
        ({ id, identificador, tipo: Tipo.HABILIDADE, pecaPaiId: 1, dados });
    const pai = { id: 1, identificador: "arq", tipo: Tipo.ARQUETIPO, pecaPaiId: null, dados: {} };

    function montar(opcoes: { selecionada: string | null; itens: ReturnType<typeof habilidade>[]; peca: string; caminho?: readonly (string | number)[] }) {
        const itens = opcoes.itens;
        const store = {
            estado: signal("ok"), selecionada: signal(opcoes.selecionada),
            item: vi.fn((identificador: string) => identificador === "arq" ? pai : itens.find((i) => i.identificador === identificador)),
            pai: vi.fn(() => pai), irmas: vi.fn(() => itens), alterarCampo: vi.fn(),
        };
        TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
        const fixture = TestBed.createComponent(OficinaPropriedades);
        fixture.componentRef.setInput("peca", opcoes.peca);
        if (opcoes.caminho) fixture.componentRef.setInput("caminhoDaLista", opcoes.caminho);
        fixture.detectChanges();
        return { fixture, raiz: fixture.nativeElement as HTMLElement, store };
    }

    it("não desenha nada sem a peça selecionada", () => {
        const { raiz } = montar({ selecionada: null, peca: "h", itens: [habilidade("h", 2, { glifo: "⬦" })] });
        expect(raiz.querySelector(".oficina-propriedades")).toBeNull();
    });

    it("escolher o glifo grava no caminho; escolher o atual não grava", () => {
        const { raiz, store } = montar({ selecionada: "h", peca: "h", itens: [habilidade("h", 2, { glifo: "⬦" })] });
        raiz.querySelector<HTMLButtonElement>('[aria-label="Glifo: ◈"]')!.click();
        raiz.querySelector<HTMLButtonElement>('[aria-label="Glifo: ⬦"]')!.click();
        expect(store.alterarCampo).toHaveBeenCalledTimes(1);
        expect(store.alterarCampo).toHaveBeenCalledWith("h", ["glifo"], "◈", "Glifo da habilidade", false);
    });

    it("Geral melhorada liga e desliga (desligada, o campo sai do dados)", () => {
        const { raiz, store } = montar({ selecionada: "h", peca: "h", itens: [habilidade("h", 2, { melhorada: true })] });
        const botao = Array.from(raiz.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Geral melhorada"))!;
        expect(botao.getAttribute("aria-pressed")).toBe("true");
        botao.click();
        expect(store.alterarCampo).toHaveBeenCalledWith("h", ["melhorada"], undefined, "Geral melhorada", false);
    });

    it("Habilidade inicial passa a marca da atual para esta, de modo que continue existindo uma só", () => {
        const { raiz, store } = montar({
            selecionada: "h", peca: "h",
            itens: [habilidade("h", 2, { melhorada: true }), habilidade("atual", 3, { inicial: true })],
        });
        Array.from(raiz.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Habilidade inicial"))!.click();
        expect(store.alterarCampo).toHaveBeenCalledWith("h", ["inicial"], true, "Habilidade inicial", false);
        expect(store.alterarCampo).toHaveBeenCalledWith("h", ["melhorada"], undefined, "Habilidade inicial", false);
        expect(store.alterarCampo).toHaveBeenCalledWith("atual", ["inicial"], undefined, "Habilidade inicial", false);
    });

    it("a habilidade que já é a inicial tem o botão travado", () => {
        const { raiz } = montar({ selecionada: "h", peca: "h", itens: [habilidade("h", 2, { inicial: true })] });
        const botao = Array.from(raiz.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Habilidade inicial"))!;
        expect(botao.disabled).toBe(true);
    });

    it("lista numerada: o número inicial é stepper no caminho da lista", () => {
        const lista = { id: 5, identificador: "l", tipo: Tipo.LISTA, pecaPaiId: null, dados: { ordenada: true, inicio: 1, itens: [] } };
        const { fixture, store } = montar({ selecionada: "l", peca: "l", itens: [lista as never], caminho: [] });
        const passo = fixture.debugElement.query(By.directive(StepInput)).componentInstance as StepInput;
        passo.valorAlterado.emit(4);
        passo.valorAlterado.emit(-1);
        expect(store.alterarCampo).toHaveBeenCalledTimes(1);
        expect(store.alterarCampo).toHaveBeenCalledWith("l", ["inicio"], 4, "Início da lista", false);
    });
});
