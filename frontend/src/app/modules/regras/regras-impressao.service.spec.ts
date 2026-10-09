import { TestBed } from "@angular/core/testing";
import { RegrasImpressaoService } from "./regras-impressao.service";
import { RegrasDocumento } from "./regras.model";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";

describe("Exportação nativa das Regras", () => {
    const documento: RegrasDocumento = {
        tipo: "documento", id: "guia", titulo: "Guia de Mestre", versao: "4.2.0",
        filhos: [{ tipo: "paragrafo", trechos: [{ tipo: "tarja", comprimento: 5 }] },
            { tipo: "nota", trechos: [{ tipo: "texto", texto: "VERSÃO 4.1.1" }] },
            { tipo: "secao", nivel: 1, glifo: "⬢", titulo: "Introdução", ancora: "introducao",
                filhos: [{ tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Regra inteira" }] },
                    { tipo: "generico", motivo: "prosa", origemMarkdown: "Texto preservado",
                        trechos: [{ tipo: "texto", texto: "Texto preservado" }] }] }],
    };
    afterEach(() => {
        window.dispatchEvent(new Event("afterprint")); vi.restoreAllMocks();
    });

    it("projeta livro inteiro, capa/versão e sumário sem marcas e restaura ao cancelar", async () => {
        const imprimir = vi.spyOn(window, "print").mockImplementation(() => undefined);
        const service = TestBed.inject(RegrasImpressaoService);
        const titulo = document.title;
        await service.exportarDocumento(documento);
        const raiz = document.querySelector("app-regras-impressao")!;
        expect(raiz.textContent).toContain("Regra inteira");
        expect(raiz.textContent).toContain("Texto preservado");
        expect(raiz.querySelector("nav")?.textContent).toContain("Introdução");
        expect(raiz.querySelector(".regras-impressao__capa")?.textContent).toContain("v4.2.0");
        expect(raiz.textContent).not.toContain("VERSÃO 4.1.1");
        expect(raiz.querySelector(".regras-inline__tarja")).not.toBeNull();
        expect(imprimir).toHaveBeenCalledOnce();
        await service.exportarDocumento(documento); expect(imprimir).toHaveBeenCalledOnce();
        window.dispatchEvent(new Event("afterprint"));
        expect(document.querySelector("app-regras-impressao")).toBeNull();
        expect(document.body.classList.contains("regras-imprimindo")).toBe(false);
        expect(document.title).toBe(titulo); expect(service.preparando()).toBe(false);
        await service.exportarDocumento(documento); expect(imprimir).toHaveBeenCalledTimes(2);
    });

    it("remove projeção e libera retry quando a impressão lança erro", async () => {
        vi.spyOn(window, "print").mockImplementation(() => { throw new Error("Falha"); });
        const notificar = vi.spyOn(TestBed.inject(NotificacaoService), "notificar");
        const service = TestBed.inject(RegrasImpressaoService);
        await service.exportarDocumento(documento);
        expect(document.querySelector("app-regras-impressao")).toBeNull();
        expect(service.preparando()).toBe(false); expect(notificar).toHaveBeenCalledOnce();
    });

    it("mantém a exportação do Sistema suspensa mesmo por chamada direta", async () => {
        const imprimir = vi.spyOn(window, "print").mockImplementation(() => undefined);
        const service = TestBed.inject(RegrasImpressaoService);
        await service.exportarDocumento({ ...documento, id: "sistema" });
        expect(imprimir).not.toHaveBeenCalled();
        expect(document.querySelector("app-regras-impressao")).toBeNull();
        expect(service.preparando()).toBe(false);
    });
});
