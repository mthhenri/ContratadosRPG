import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { RegrasDocumento } from "./regras.model";
import { RegrasLeitor } from "./regras-leitor.component";
import { RegrasService } from "./regras.service";
import { RegrasPesquisaController } from "./regras-pesquisa.controller";
import { RegrasLeituraStore } from "./regras-leitura.store";

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
    afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

    it("devolve o painel ao topo sem rolar a página e conserva o termo pesquisado", async () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.componentRef.setInput("emPainel", true);
        leitor.detectChanges();
        const raiz = leitor.nativeElement as HTMLElement;
        const area = raiz.querySelector<HTMLElement>(".regras__rolagem")!;
        const rolar = vi.fn(); area.scrollTo = rolar;
        const pesquisa = leitor.debugElement.injector.get(RegrasPesquisaController);
        pesquisa.confirmarTermo("vida");
        const termo = pesquisa.termo();
        await leitor.whenStable();
        rolar.mockClear();
        vi.mocked(window.scrollTo).mockClear();
        raiz.querySelector<HTMLButtonElement>('[aria-label="Voltar ao topo"]')!.click();
        expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
        expect(window.scrollTo).not.toHaveBeenCalled();
        expect(pesquisa.termo()).toBe(termo);
        rolar.mockClear();
        raiz.querySelector<HTMLButtonElement>(".regras__marca")!.click();
        expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
        expect(window.scrollTo).not.toHaveBeenCalled();
        expect(pesquisa.termo()).toBe(termo);
        leitor.destroy();
    });

    it("respeita movimento reduzido ao voltar a página ao topo", () => {
        vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true } as MediaQueryList)));
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema"); leitor.detectChanges();
        leitor.nativeElement.querySelector('[aria-label="Voltar ao topo"]').click();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
        expect(leitor.componentInstance["ativo"]()).toBeNull();
        leitor.destroy();
    });

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

    it("trata Enter uma única vez e Esc limpa antes do fechamento da gaveta", () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema"); leitor.detectChanges();
        const pesquisa = leitor.debugElement.injector.get(RegrasPesquisaController);
        TestBed.inject(RegrasLeituraStore).alterarTermoPesquisa("vida");
        leitor.detectChanges();
        const navegar = vi.spyOn(pesquisa, "navegar").mockImplementation(() => undefined);
        const campo = leitor.nativeElement.querySelector("app-regras-pesquisa input");
        campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        expect(navegar).toHaveBeenCalledExactlyOnceWith(1);
        campo.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", shiftKey: true, bubbles: true,
        }));
        expect(navegar).toHaveBeenLastCalledWith(-1);
        campo.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(pesquisa.termo()).toBe(""); leitor.destroy();
    });

    it("isola IDs da projeção do outro livro mesmo com âncoras compartilhadas", () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema"); leitor.detectChanges();
        const pesquisa = leitor.debugElement.injector.get(RegrasPesquisaController);
        pesquisa.outroDocumento.set({ ...documento, id: "guia" }); leitor.detectChanges();
        const raiz = leitor.nativeElement as HTMLElement;
        const titulos = [...raiz.querySelectorAll<HTMLElement>('[data-ancora-regras="vida"]')];
        expect(titulos).toHaveLength(2);
        expect(titulos[0].id).not.toBe(titulos[1].id);
        leitor.destroy();
    });

    it("mede a barra em pixels mesmo quando o token está em rem, sem cobrir a ocorrência", () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema"); leitor.detectChanges();
        TestBed.inject(RegrasLeituraStore).alterarTermoPesquisa("vida"); leitor.detectChanges();
        const barra = document.createElement("header"); barra.className = "topbar";
        barra.style.height = "3.25rem"; document.body.append(barra);
        vi.spyOn(barra, "getBoundingClientRect").mockReturnValue({ height: 52 } as DOMRect);
        const contador = leitor.nativeElement.querySelector(".regras__pesquisa-contador");
        vi.spyOn(contador, "getBoundingClientRect").mockReturnValue({ height: 43 } as DOMRect);
        expect(leitor.componentInstance["linhaLeitura"]()).toBe(111);
        barra.remove(); leitor.destroy();
    });
});
