import { Component, signal, type WritableSignal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { LivroTrechoDto } from "@contratados-rpg/shared/dtos/livro";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OficinaStore } from "./oficina.store";
import { OficinaTexto } from "./oficina-texto.component";

@Component({
    imports: [OficinaTexto],
    template: `
        <app-oficina-texto peca="P1" campo="nome" rotulo="Nome" [texto]="nome()" />
        <app-oficina-texto peca="P2" campo="trechos" rotulo="Parágrafo" [trechos]="trechos()" />
        <app-oficina-texto peca="P3" campo="danos.0.trechos" rotulo="Dano" [caminho]="['danos', 0, 'trechos']" [trechos]="[]" />
        <app-oficina-texto peca="P4" campo="porte" rotulo="Porte" [opcional]="true" [trechos]="porte()" />
        <app-oficina-texto peca="P5" campo="trechos" rotulo="Abertura" [quebras]="true" [trechos]="abertura" />
    `,
})
class Hospedeiro {
    readonly nome = signal("Golpe");
    readonly trechos = signal<LivroTrechoDto[]>([{ tipo: "texto", texto: "um dois" }]);
    readonly porte = signal<LivroTrechoDto[]>([{ tipo: "texto", texto: "Leve" }]);
    readonly abertura: LivroTrechoDto[] = [{ tipo: "italico", filhos: [{ tipo: "texto", texto: "Um.\n\nDois." }] }];
}

describe("OficinaTexto", () => {
    let store: {
        item: ReturnType<typeof vi.fn>; alterarDados: ReturnType<typeof vi.fn>; salvarAgora: ReturnType<typeof vi.fn>;
        selecionar: ReturnType<typeof vi.fn>; ehParagrafo: ReturnType<typeof vi.fn>; criarDepois: ReturnType<typeof vi.fn>;
        remover: ReturnType<typeof vi.fn>; pedidoFoco: WritableSignal<unknown>; pedirFoco: ReturnType<typeof vi.fn>;
    };

    function montar() {
        const fixture = TestBed.createComponent(Hospedeiro);
        const raiz = fixture.nativeElement as HTMLElement;
        document.body.append(raiz);
        fixture.detectChanges();
        const [nome, paragrafo, dano, porte, abertura] = Array.from(raiz.querySelectorAll<HTMLElement>(".oficina-texto")) as
            [HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement];
        return { fixture, nome, paragrafo, dano, porte, abertura };
    }
    function teclar(alvo: HTMLElement, key: string, extra: KeyboardEventInit = {}): KeyboardEvent {
        const evento = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra });
        alvo.dispatchEvent(evento);
        return evento;
    }
    function cursorEm(no: Node, posicao: number): void {
        const intervalo = document.createRange();
        intervalo.setStart(no, posicao);
        intervalo.collapse(true);
        const selecao = window.getSelection() as Selection;
        selecao.removeAllRanges();
        selecao.addRange(intervalo);
    }

    beforeEach(() => {
        store = {
            item: vi.fn((identificador: string) => ({ identificador, id: 1, tipo: "PARAGRAFO",
                dados: { trechos: [], nome: "Golpe", danos: [{ rotulo: "DANO", trechos: [] }], porte: [{ tipo: "texto", texto: "Leve" }] } })),
            alterarDados: vi.fn(), salvarAgora: vi.fn(), selecionar: vi.fn(), ehParagrafo: vi.fn(() => true),
            criarDepois: vi.fn(), remover: vi.fn(), pedidoFoco: signal(null), pedirFoco: vi.fn(),
        };
        TestBed.configureTestingModule({ providers: [{ provide: OficinaStore, useValue: store }] });
    });

    afterEach(() => {
        document.body.replaceChildren();
    });

    it("com caminho, grava o texto dentro do campo aninhado e preserva o resto do dados", () => {
        const { dano } = montar();
        dano.textContent = "1D6";
        dano.dispatchEvent(new Event("input"));
        dano.dispatchEvent(new Event("blur"));
        const dados = store.alterarDados.mock.calls.at(-1)?.[1] as { nome: string; danos: { rotulo: string; trechos: unknown[] }[] };
        expect(dados.nome).toBe("Golpe");
        expect(dados.danos[0].rotulo).toBe("DANO");
        expect(dados.danos[0].trechos).toEqual([{ tipo: "texto", texto: "1D6" }]);
        expect(store.alterarDados.mock.calls.at(-1)?.[2]).toMatchObject({ chave: "P3:danos.0.trechos" });
    });

    it("campo opcional esvaziado some do dados em vez de virar lista vazia", () => {
        const { porte } = montar();
        porte.textContent = "";
        porte.dispatchEvent(new Event("input"));
        porte.dispatchEvent(new Event("blur"));
        const dados = store.alterarDados.mock.calls.at(-1)?.[1] as Record<string, unknown>;
        expect("porte" in dados).toBe(false);
        expect(dados["nome"]).toBe("Golpe");
    });

    it("mostra o texto e é uma caixa de texto rotulada e editável", () => {
        const { nome, paragrafo } = montar();
        expect(nome.textContent).toBe("Golpe");
        expect(paragrafo.textContent).toBe("um dois");
        expect(paragrafo.getAttribute("role")).toBe("textbox");
        expect(paragrafo.getAttribute("aria-label")).toBe("Parágrafo");
        expect(paragrafo.getAttribute("contenteditable")).toBe("true");
    });

    it("ao sair do campo entrega o texto novo ao store e pede para salvar na hora", () => {
        const { nome } = montar();
        nome.focus();
        nome.textContent = "Golpe Furtivo";
        nome.dispatchEvent(new Event("blur"));
        expect(store.selecionar).toHaveBeenCalledWith("P1");
        expect(store.alterarDados).toHaveBeenCalledTimes(1);
        const [identificador, dados, passo] = store.alterarDados.mock.calls[0];
        expect(identificador).toBe("P1");
        expect(dados.nome).toBe("Golpe Furtivo");
        expect(passo).toEqual({ rotulo: "Edição de texto", chave: "P1:nome" });
        expect(store.salvarAgora).toHaveBeenCalled();
    });

    it("não entrega nada quando o texto não mudou", () => {
        const { nome } = montar();
        nome.dispatchEvent(new Event("blur"));
        expect(store.alterarDados).not.toHaveBeenCalled();
    });

    it("refaz o campo quando o valor muda por fora (Desfazer), sem tocar no que ele mesmo entregou", () => {
        const { fixture, paragrafo } = montar();
        paragrafo.append(" três");
        paragrafo.dispatchEvent(new Event("blur"));
        fixture.componentInstance.trechos.set([{ tipo: "texto", texto: "um dois três" }]);
        fixture.detectChanges();
        expect(paragrafo.textContent).toBe("um dois três");
        fixture.componentInstance.trechos.set([{ tipo: "texto", texto: "voltou" }]);
        fixture.detectChanges();
        expect(paragrafo.textContent).toBe("voltou");
    });

    it("NA3 seguido de espaço vira o selo de Nível de Ameaça, com o cursor depois dele", () => {
        const { paragrafo } = montar();
        paragrafo.textContent = "contra NA3 ";
        const texto = paragrafo.firstChild as Text;
        cursorEm(texto, texto.length);
        paragrafo.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: " ", bubbles: true }));
        const selo = paragrafo.querySelector<HTMLElement>("[data-trecho]");
        expect(selo).not.toBeNull();
        expect(JSON.parse(selo?.dataset["trecho"] as string)).toEqual({ tipo: "nivel-ameaca", nivel: 3, texto: "NA Médio [3]" });
        expect(paragrafo.firstChild?.textContent).toBe("contra ");
        expect(paragrafo.lastChild?.textContent).toBe(" ");
    });

    it("Enter num campo curto pula ao próximo campo, sem quebrar linha", () => {
        const { nome, paragrafo } = montar();
        nome.focus();
        const evento = teclar(nome, "Enter");
        expect(evento.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(paragrafo);
        expect(store.criarDepois).not.toHaveBeenCalled();
    });

    it("Enter no fim do parágrafo cria outro parágrafo vazio ao lado", () => {
        const { paragrafo } = montar();
        const texto = paragrafo.firstChild as Text;
        cursorEm(texto, texto.length);
        teclar(paragrafo, "Enter");
        expect(store.criarDepois).toHaveBeenCalledTimes(1);
        const [referencia, campo, dados, antes] = store.criarDepois.mock.calls[0];
        expect([referencia, campo]).toEqual(["P2", "trechos"]);
        expect(dados.trechos).toEqual([]);
        expect(antes).toBeUndefined();
    });

    it("Enter no meio parte o parágrafo: o começo fica, o resto vai para a peça nova", () => {
        const { paragrafo } = montar();
        cursorEm(paragrafo.firstChild as Text, 2);
        teclar(paragrafo, "Enter");
        const [, , dados, antes] = store.criarDepois.mock.calls[0];
        expect(antes.trechos).toEqual([{ tipo: "texto", texto: "um" }]);
        expect(dados.trechos).toEqual([{ tipo: "texto", texto: " dois" }]);
    });

    it("com `quebras`, Enter grava uma linha em branco e Shift+Enter uma quebra simples, preservando o itálico externo", () => {
        const { abertura } = montar();
        cursorEm(abertura.querySelector("em")!.firstChild as Text, 3);
        teclar(abertura, "Enter");
        expect(store.criarDepois).not.toHaveBeenCalled();
        abertura.dispatchEvent(new Event("blur"));
        const gravado = store.alterarDados.mock.calls.at(-1)![1] as { trechos: LivroTrechoDto[] };
        expect(gravado.trechos).toEqual([{ tipo: "italico", filhos: [{ tipo: "texto", texto: "Um.\n\n\n\nDois." }] }]);
        teclar(abertura, "Enter", { shiftKey: true });
        abertura.dispatchEvent(new Event("blur"));
        const outro = store.alterarDados.mock.calls.at(-1)![1] as { trechos: LivroTrechoDto[] };
        expect(outro.trechos).toEqual([{ tipo: "italico", filhos: [{ tipo: "texto", texto: "Um.\n\n\n\n\nDois." }] }]);
    });

    it("Backspace em parágrafo vazio o remove e leva o foco ao campo anterior", () => {
        const { paragrafo } = montar();
        paragrafo.textContent = "";
        teclar(paragrafo, "Backspace");
        expect(store.remover).toHaveBeenCalledWith("P2", { identificador: "P1", campo: "nome", posicao: "fim" });
    });

    it("Backspace com texto, ou em campo que não é parágrafo, não remove nada", () => {
        const { nome, paragrafo } = montar();
        teclar(paragrafo, "Backspace");
        store.ehParagrafo.mockReturnValue(false);
        nome.textContent = "";
        teclar(nome, "Backspace");
        expect(store.remover).not.toHaveBeenCalled();
    });

    it("Ctrl+B e Ctrl+I aplicam negrito e itálico; em campo simples não", () => {
        const comando = vi.fn(() => true);
        (document as unknown as { execCommand: unknown }).execCommand = comando;
        const { nome, paragrafo } = montar();
        expect(teclar(paragrafo, "b", { ctrlKey: true }).defaultPrevented).toBe(true);
        teclar(paragrafo, "i", { ctrlKey: true });
        expect(comando.mock.calls.map((chamada) => (chamada as unknown[])[0])).toEqual(["bold", "italic"]);
        teclar(nome, "b", { ctrlKey: true });
        expect(comando).toHaveBeenCalledTimes(2);
    });

    it("Ctrl+Y e Ctrl+Shift+Z são engolidos (sem refazer nativo); Ctrl+Z fica para o leitor", () => {
        const { paragrafo } = montar();
        expect(teclar(paragrafo, "y", { ctrlKey: true }).defaultPrevented).toBe(true);
        expect(teclar(paragrafo, "z", { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
        expect(teclar(paragrafo, "z", { ctrlKey: true }).defaultPrevented).toBe(false);
    });

    it("pedido de foco do store leva o cursor ao campo e é consumido", async () => {
        vi.useFakeTimers();
        const { paragrafo } = montar();
        store.pedidoFoco.set({ identificador: "P2", campo: "trechos", posicao: "inicio" });
        TestBed.tick();
        await vi.advanceTimersByTimeAsync(1);
        expect(document.activeElement).toBe(paragrafo);
        expect(store.pedirFoco).toHaveBeenCalledWith(null);
        vi.useRealTimers();
    });
});
