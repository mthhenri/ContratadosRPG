import { ComponentFixture, TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LeitorPdfMobile } from "./leitor-pdf-mobile.component";

const paginaFalsa = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
};

function criarDocumentoFalso(numPages: number) {
    return {
        numPages,
        getPage: vi.fn().mockResolvedValue(paginaFalsa),
        loadingTask: { destroy: vi.fn().mockResolvedValue(undefined) },
    };
}

const getDocumentMock = vi.fn();

vi.mock("pdfjs-dist", () => ({
    getDocument: (...args: unknown[]) => getDocumentMock(...args),
    GlobalWorkerOptions: {},
}));

describe("LeitorPdfMobile", () => {
    let fixture: ComponentFixture<LeitorPdfMobile>;

    beforeEach(() => {
        getDocumentMock.mockReset();
    });

    it("carrega o documento e mostra a primeira página, sem seleção/busca de texto", async () => {
        getDocumentMock.mockReturnValue({ promise: Promise.resolve(criarDocumentoFalso(5)) });
        await montar();

        expect(fixture.nativeElement.textContent).toContain("1 / 5");
        expect(fixture.nativeElement.querySelector(".leitor-pdf-mobile__tela")).toBeTruthy();
        expect(fixture.nativeElement.querySelector(".leitor-pagina__texto")).toBeNull();
    });

    it('desabilita "Página anterior" na primeira página e avança com "Próxima página"', async () => {
        getDocumentMock.mockReturnValue({ promise: Promise.resolve(criarDocumentoFalso(3)) });
        await montar();

        const anterior = obter<HTMLButtonElement>('[aria-label="Página anterior"]');
        expect(anterior.disabled).toBe(true);

        clicar('[aria-label="Próxima página"]');

        expect(fixture.nativeElement.textContent).toContain("2 / 3");
        expect(anterior.disabled).toBe(false);
    });

    it('desabilita "Próxima página" na última página', async () => {
        getDocumentMock.mockReturnValue({ promise: Promise.resolve(criarDocumentoFalso(2)) });
        await montar();

        clicar('[aria-label="Próxima página"]');

        expect(fixture.nativeElement.textContent).toContain("2 / 2");
        expect(obter<HTMLButtonElement>('[aria-label="Próxima página"]').disabled).toBe(true);
    });

    it("limita o zoom entre 50% e 300%", async () => {
        getDocumentMock.mockReturnValue({ promise: Promise.resolve(criarDocumentoFalso(1)) });
        await montar();

        const diminuir = obter<HTMLButtonElement>('[aria-label="Diminuir zoom"]');
        const aumentar = obter<HTMLButtonElement>('[aria-label="Aumentar zoom"]');

        for (let i = 0; i < 5; i++) {
            clicar('[aria-label="Diminuir zoom"]');
        }
        expect(diminuir.disabled).toBe(true);

        for (let i = 0; i < 20; i++) {
            clicar('[aria-label="Aumentar zoom"]');
        }
        expect(aumentar.disabled).toBe(true);
    });

    it("mostra estado de erro e desabilita a navegação quando o documento não carrega", async () => {
        getDocumentMock.mockReturnValue({ promise: Promise.reject(new Error("falhou")) });
        await montar();

        expect(fixture.nativeElement.textContent).toContain("Não foi possível carregar Sistema");
        expect(
            (fixture.nativeElement.querySelector(".leitor-pdf-mobile__tela") as HTMLElement).hidden,
        ).toBe(true);
        expect(obter<HTMLButtonElement>('[aria-label="Próxima página"]').disabled).toBe(true);
        expect(obter<HTMLButtonElement>('[aria-label="Aumentar zoom"]').disabled).toBe(true);
    });

    async function montar(
        url = "/documentos/sistema-v4.1.0.pdf",
        titulo = "Sistema",
    ): Promise<void> {
        await TestBed.configureTestingModule({ imports: [LeitorPdfMobile] }).compileComponents();
        fixture = TestBed.createComponent(LeitorPdfMobile);
        fixture.componentRef.setInput("url", url);
        fixture.componentRef.setInput("titulo", titulo);
        fixture.detectChanges();

        // O carregamento passa por um `import('pdfjs-dist')` dinâmico (mockado) — não é
        // rastreado pela estabilidade do Angular, então esperamos o próprio DOM sair do
        // estado "carregando".
        await vi.waitFor(() => {
            fixture.detectChanges();
            expect(fixture.nativeElement.textContent).not.toContain("Carregando documento");
        });
    }

    function clicar(seletor: string): void {
        obter<HTMLButtonElement>(seletor).click();
        fixture.detectChanges();
    }

    function obter<T extends HTMLElement = HTMLElement>(seletor: string): T {
        const elemento = fixture.nativeElement.querySelector(seletor) as T | null;
        expect(elemento, `Elemento ausente: ${seletor}`).not.toBeNull();
        return elemento!;
    }
});
