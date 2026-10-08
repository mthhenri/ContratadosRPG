import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { RegrasDocumento } from "./regras.model";
import { RegrasLeitor } from "./regras-leitor.component";
import { RegrasService } from "./regras.service";

describe("Leitor compartilhado de Regras", () => {
    const documento: RegrasDocumento = {
        tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.3",
        filhos: [{ tipo: "secao", nivel: 2, glifo: "⬡", titulo: "Vida", ancora: "vida",
            filhos: [] }],
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [RegrasLeitor], providers: [
            { provide: RegrasService, useValue: { carregarDocumento: () => of(documento) } },
        ] });
        vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    it("isola os IDs do mesmo capítulo na página e no painel, mantendo a âncora canônica", () => {
        const leitores = [TestBed.createComponent(RegrasLeitor),
            TestBed.createComponent(RegrasLeitor)];
        for (const leitor of leitores) {
            leitor.componentRef.setInput("livro", "sistema");
        }
        leitores.forEach(leitor => leitor.detectChanges());
        const titulos = leitores.map(leitor => leitor.nativeElement
            .querySelector('[data-ancora-regras="vida"]') as HTMLElement);
        expect(titulos[0].id).not.toBe(titulos[1].id);
        expect(titulos.every(titulo => titulo.dataset["ancoraRegras"] === "vida")).toBe(true);
        leitores.forEach(leitor => leitor.destroy());
    });

    it("troca o livro por evento do hospedeiro, sem navegar a rota da tela de fundo", () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.detectChanges();
        const trocar = vi.fn();
        leitor.componentInstance.livroAlterado.subscribe(trocar);
        const raiz = leitor.nativeElement as HTMLElement;
        const guia = [...raiz.querySelectorAll<HTMLButtonElement>("button[app-segmentado-item]")]
            .find(botao => botao.textContent?.trim() === "Guia")!;
        guia.click();
        expect(trocar).toHaveBeenCalledWith("guia");
        leitor.destroy();
    });
});
