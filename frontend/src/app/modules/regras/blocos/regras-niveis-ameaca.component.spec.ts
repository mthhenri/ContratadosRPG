import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { describe, expect, it, vi } from "vitest";
import { StepInput } from "../../../shared/ui/stepper/step-input.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasNiveisAmeaca } from "./regras-niveis-ameaca.component";

const descricao = (texto: string) => [{ tipo: "texto" as const, texto }];

describe("RegrasNiveisAmeaca", () => {
    const niveis = [
        { nivel: 1, referenciaImagem: "image2", descricao: descricao("Nula.") },
        { nivel: 2, referenciaImagem: "image3", descricao: descricao("Baixa.") },
    ];

    function montar(opcoes: { oficina: boolean; selecionada?: boolean; dados?: unknown }) {
        const store = {
            estado: signal("ok"), selecionada: signal(opcoes.selecionada ? "N1" : null), pedidoFoco: signal(null),
            item: vi.fn(() => ({ dados: opcoes.dados ?? { niveis } })), alterarCampo: vi.fn(), pedirFoco: vi.fn(),
            selecionar: vi.fn(), ehParagrafo: vi.fn(() => false),
        };
        if (opcoes.oficina) {
            TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
        }
        const fixture = TestBed.createComponent(RegrasNiveisAmeaca);
        fixture.componentRef.setInput("bloco", { tipo: "niveis-ameaca", peca: opcoes.oficina ? "N1" : undefined, cabecalho: [], linhas: [], niveis });
        fixture.detectChanges();
        return { fixture, raiz: fixture.nativeElement as HTMLElement, store };
    }

    it("fora da Oficina só lê: selo NA, descrição e nenhum controle", () => {
        const { raiz } = montar({ oficina: false });
        expect(raiz.querySelectorAll("app-cartao")).toHaveLength(2);
        expect(raiz.textContent).toContain("NA 1");
        expect(raiz.querySelector("app-step-input")).toBeNull();
        expect(raiz.querySelector("button")).toBeNull();
    });

    it("na Oficina o número é stepper de 0 a 7; sem seleção não há remover nem adicionar", () => {
        const { raiz } = montar({ oficina: true });
        expect(raiz.querySelectorAll("app-step-input")).toHaveLength(2);
        expect(raiz.querySelector("button[aria-label^=Remover]")).toBeNull();
        expect(raiz.querySelector("button[aria-label=\"Adicionar nível de ameaça\"]")).toBeNull();
    });

    it("grava o número no caminho, recusando fora de 0–7, fracionário e valor igual", () => {
        const { fixture, store } = montar({ oficina: true });
        const passo = fixture.debugElement.queryAll(By.directive(StepInput))[1].componentInstance as StepInput;
        passo.valorAlterado.emit(5);
        passo.valorAlterado.emit(8);
        passo.valorAlterado.emit(-1);
        passo.valorAlterado.emit(2.5);
        passo.valorAlterado.emit(2);
        expect(store.alterarCampo).toHaveBeenCalledTimes(1);
        expect(store.alterarCampo).toHaveBeenCalledWith("N1", ["niveis", 1, "nivel"], 5, "Nível de ameaça", false);
    });

    it("selecionado: adiciona o menor número livre com imagem vazia e remove o escolhido", () => {
        const { raiz, store } = montar({ oficina: true, selecionada: true });
        raiz.querySelector<HTMLButtonElement>("button[aria-label=\"Adicionar nível de ameaça\"]")!.click();
        expect(store.alterarCampo).toHaveBeenCalledWith("N1", ["niveis"],
            [...niveis, { nivel: 0, referenciaImagem: "", descricao: [] }], "Adicionar nível de ameaça", false);
        expect(store.pedirFoco).toHaveBeenCalledWith({ identificador: "N1", campo: "niveis.2.descricao", posicao: "inicio" });
        raiz.querySelector<HTMLButtonElement>("button[aria-label=\"Remover nível de ameaça 1\"]")!.click();
        expect(store.alterarCampo).toHaveBeenLastCalledWith("N1", ["niveis"], [niveis[1]], "Remover nível de ameaça", false);
    });

    it("com os oito níveis em uso o botão de adicionar fica desabilitado", () => {
        const todos = Array.from({ length: 8 }, (_, nivel) => ({ nivel, referenciaImagem: "", descricao: descricao("x") }));
        const { raiz, store } = montar({ oficina: true, selecionada: true, dados: { niveis: todos } });
        const botao = raiz.querySelector<HTMLButtonElement>("button[aria-label=\"Adicionar nível de ameaça\"]")!;
        expect(botao.disabled).toBe(true);
        botao.click();
        expect(store.alterarCampo).not.toHaveBeenCalled();
    });
});
