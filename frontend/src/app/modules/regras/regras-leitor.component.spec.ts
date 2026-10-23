import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { TipoLivroVersaoSituacaoEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { SessaoService } from "../../core/services/sessao.service";
import { of, throwError } from "rxjs";
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
            { provide: RegrasService, useValue: {
                carregarDocumento: () => of(documento),
                carregarLeitura: () => of({ documento, situacao: null, numero: null, ancorasAntigas: {} }),
            } },
        ] });
        vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    });
    afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

    it.each([false, true])("oferece mudanças publicadas sem Oficina (painel=%s)", (emPainel) => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.componentRef.setInput("emPainel", emPainel);
        leitor.detectChanges();
        const gatilho = (leitor.nativeElement as HTMLElement)
            .querySelector<HTMLButtonElement>('[aria-label="O que mudou nas publicações"]');
        expect(gatilho).not.toBeNull();
        expect(gatilho?.disabled).toBe(false);
        gatilho?.click();
        leitor.detectChanges();
        expect(leitor.nativeElement.querySelector('app-gaveta.gaveta--aberta')?.textContent)
            .toContain("O que mudou");
        leitor.destroy();
    });

    it("o link da comparação troca o rascunho pela regra oficial vigente", async () => {
        const carregarPublicada = vi.fn(() => of({
            documento: { ...documento, versao: "4.1.5" },
            situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
            numero: "4.1.5", ancorasAntigas: {},
        }));
        TestBed.overrideProvider(RegrasService, { useValue: {
            carregarLeitura: () => of({ documento,
                situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO,
                numero: "4.1.6-rascunho", ancorasAntigas: {} }),
            carregarPublicada,
        } });
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.detectChanges();
        expect(leitor.nativeElement.textContent).toContain("ainda não publicada");
        leitor.componentInstance["irParaPublicada"]("vida");
        leitor.detectChanges();
        await leitor.whenStable();
        expect(carregarPublicada).toHaveBeenCalledWith({ codigo: "sistema" });
        expect(leitor.componentInstance["leitura"]()?.situacao).toBe("PUBLICADA");
        expect(leitor.componentInstance["ativo"]()).toBe("vida");
        expect(leitor.nativeElement.textContent).not.toContain("ainda não publicada");
        leitor.destroy();
    });

    it("nova tentativa de um link oficial conserva a publicação e a âncora", () => {
        const carregarPublicada = vi.fn()
            .mockReturnValueOnce(throwError(() => new Error("Rede indisponível")))
            .mockReturnValueOnce(of({ documento: { ...documento, versao: "4.1.5" },
                situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
                numero: "4.1.5", ancorasAntigas: {} }));
        const carregarLeitura = vi.fn(() => of({ documento,
            situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO,
            numero: "4.1.6-rascunho", ancorasAntigas: {} }));
        TestBed.overrideProvider(RegrasService, { useValue: { carregarPublicada, carregarLeitura } });
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.detectChanges();
        leitor.componentInstance["irParaPublicada"]("vida");
        leitor.detectChanges();
        leitor.componentInstance["tentarNovamente"]();
        leitor.detectChanges();
        expect(carregarPublicada).toHaveBeenCalledTimes(2);
        expect(carregarLeitura).toHaveBeenCalledTimes(1);
        expect(leitor.componentInstance["leitura"]()?.situacao).toBe("PUBLICADA");
        expect(leitor.componentInstance["ativo"]()).toBe("vida");
        leitor.destroy();
    });

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

    it("Ctrl+K abre a paleta Ir para… e a escolha leva à âncora do sumário", () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.detectChanges();
        const raiz = leitor.nativeElement as HTMLElement;
        const atalho = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true,
            cancelable: true });
        document.dispatchEvent(atalho);
        leitor.detectChanges();
        expect(atalho.defaultPrevented).toBe(true);
        expect(leitor.componentInstance["paletaAberta"]()).toBe(true);
        expect(Array.from(raiz.querySelectorAll(".paleta__rotulo")).map(e => e.textContent!.trim()))
            .toEqual(["Vida"]);
        raiz.querySelector<HTMLElement>(".paleta__item")!.click();
        leitor.detectChanges();
        expect(leitor.componentInstance["paletaAberta"]()).toBe(false);
        expect(leitor.componentInstance["ativo"]()).toBe("vida");
        leitor.destroy();
    });

    it("Ctrl+K no painel só vale com o foco dentro dele", () => {
        const leitor = TestBed.createComponent(RegrasLeitor);
        leitor.componentRef.setInput("livro", "sistema");
        leitor.componentRef.setInput("emPainel", true);
        leitor.detectChanges();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true,
            bubbles: true, cancelable: true }));
        expect(leitor.componentInstance["paletaAberta"]()).toBe(false);
        leitor.destroy();
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

    describe("seletores do trilho e paleta em árvore", () => {
        function montarComEdicao(admin: boolean, modoOficina = false) {
            const usuario = signal(admin ? { tipo: TipoUsuarioEnum.ADMIN } : null);
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({ imports: [RegrasLeitor], providers: [
                { provide: SessaoService, useValue: { usuario } },
                { provide: RegrasService, useValue: {
                    invalidarLeitura: () => undefined,
                    carregarDocumento: () => of(documento),
                    carregarLeitura: () => of({ documento, situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
                        numero: 1, ancorasAntigas: {} }),
                } },
            ] });
            const leitor = TestBed.createComponent(RegrasLeitor);
            leitor.componentRef.setInput("livro", "sistema");
            leitor.componentRef.setInput("modoOficina", modoOficina);
            leitor.detectChanges();
            return leitor;
        }

        it("mostra os ícones d20 e coroa nos livros do trilho e da barra", () => {
            const leitor = montarComEdicao(false);
            const itens = [...(leitor.nativeElement as HTMLElement)
                .querySelectorAll("button[app-segmentado-item]")];
            expect(itens.map(i => i.querySelector("app-icone svg, app-icone")!== null)).toEqual([true, true]);
            expect(itens.map(i => i.textContent?.trim())).toEqual(["Sistema", "Guia"]);
            leitor.destroy();
        });

        it("esconde o alternador de modo sem permissão de edição", () => {
            const leitor = montarComEdicao(false);
            expect((leitor.nativeElement as HTMLElement).querySelector(".regras__modo")).toBeNull();
            leitor.destroy();
        });

        it("alternador na Leitura descreve a ação, não está pressionado e entra na Oficina", () => {
            const leitor = montarComEdicao(true);
            const botao = (leitor.nativeElement as HTMLElement)
                .querySelector<HTMLButtonElement>(".regras__modo")!;
            expect(botao.getAttribute("aria-label")).toBe("Entrar na Oficina");
            expect(botao.getAttribute("aria-pressed")).toBe("false");
            expect(botao.hasAttribute("title")).toBe(false);
            const alterou = vi.fn();
            leitor.componentInstance.modoAlterado.subscribe(alterou);
            botao.click();
            expect(alterou).toHaveBeenCalledWith(true);
            leitor.destroy();
        });

        it("alternador na Oficina volta à leitura e fica pressionado", () => {
            const leitor = montarComEdicao(true, true);
            const botao = (leitor.nativeElement as HTMLElement)
                .querySelector<HTMLButtonElement>(".regras__modo")!;
            expect(botao.getAttribute("aria-label")).toBe("Voltar à leitura");
            expect(botao.getAttribute("aria-pressed")).toBe("true");
            const alterou = vi.fn();
            leitor.componentInstance.modoAlterado.subscribe(alterou);
            botao.click();
            expect(alterou).toHaveBeenCalledWith(false);
            leitor.destroy();
        });

        it("a paleta usa árvore na Leitura e lista plana de peças na Oficina", () => {
            const leitura = montarComEdicao(true);
            leitura.componentInstance["abrirPaleta"]();
            leitura.detectChanges();
            expect((leitura.nativeElement as HTMLElement).querySelector("ul.paleta__lista")
                ?.getAttribute("role")).toBe("tree");
            leitura.destroy();
            const oficina = montarComEdicao(true, true);
            oficina.componentInstance["abrirPaleta"]();
            oficina.detectChanges();
            expect((oficina.nativeElement as HTMLElement).querySelector("ul.paleta__lista")
                ?.getAttribute("role")).toBe("listbox");
            oficina.destroy();
        });
    });
});
