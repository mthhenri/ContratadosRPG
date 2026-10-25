import { Component, input, output } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { By } from "@angular/platform-browser";
import { RegrasConsultaService } from "./regras-consulta.service";
import { RegrasFlutuante } from "./regras-flutuante.component";
import { RegrasLeitor } from "./regras-leitor.component";
import { RegrasLeituraStore } from "./regras-leitura.store";
import { PainelFlutuante } from "../../shared/ui/painel-flutuante/painel-flutuante.component";

@Component({ selector: "app-regras-leitor", template: "Leitor" })
class LeitorTeste {
    readonly livro = input.required<"sistema" | "guia">();
    readonly ancoraInicial = input<string | null>(null);
    readonly emPainel = input(false);
    readonly maximizada = input(false);
    readonly livroAlterado = output<"sistema" | "guia">();
}

describe("RegrasFlutuante", () => {
    beforeEach(async () => {
        localStorage.clear();
        TestBed.configureTestingModule({
            imports: [RegrasFlutuante], providers: [provideRouter([])],
        }).overrideComponent(RegrasFlutuante, {
            remove: { imports: [RegrasLeitor] }, add: { imports: [LeitorTeste] },
        });
        await TestBed.compileComponents();
    });

    afterEach(() => localStorage.clear());

    function montar() {
        const fixture = TestBed.createComponent(RegrasFlutuante);
        fixture.detectChanges();
        const consulta = TestBed.inject(RegrasConsultaService);
        const memoria = TestBed.inject(RegrasLeituraStore);
        const leitor = () => fixture.debugElement.query(By.directive(LeitorTeste))
            ?.componentInstance as LeitorTeste | undefined;
        return { fixture, consulta, memoria, leitor };
    }

    it("só monta o leitor ao abrir e preserva a seção fotografada durante a leitura", () => {
        const { fixture, consulta, memoria, leitor } = montar();
        expect(leitor()).toBeUndefined();
        memoria.lembrarSecao("sistema", "atributos");
        consulta.abrir();
        fixture.detectChanges();
        expect(leitor()?.ancoraInicial()).toBe("atributos");
        memoria.lembrarSecao("sistema", "equipamento");
        fixture.detectChanges();
        expect(leitor()?.ancoraInicial()).toBe("atributos");
        consulta.fechar();
        fixture.detectChanges();
        expect(leitor()).toBeUndefined();
        consulta.abrir();
        fixture.detectChanges();
        expect(leitor()?.ancoraInicial()).toBe("equipamento");
    });

    it("troca de livro restaurando a memória independente de cada um", () => {
        const { fixture, consulta, memoria, leitor } = montar();
        memoria.lembrarSecao("guia", "porte");
        consulta.abrir();
        fixture.detectChanges();
        leitor()!.livroAlterado.emit("guia");
        fixture.detectChanges();
        expect(memoria.livro()).toBe("guia");
        expect(leitor()?.ancoraInicial()).toBe("porte");
    });

    it("nova abertura restaura minimizado e mantém uma só casca", () => {
        const { fixture, consulta } = montar();
        consulta.abrir();
        fixture.detectChanges();
        const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
            .componentInstance as PainelFlutuante;
        const restaurar = vi.spyOn(painel, "restaurar");
        consulta.abrir();
        fixture.detectChanges();
        expect(restaurar).toHaveBeenCalledOnce();
        expect(fixture.debugElement.queryAll(By.directive(PainelFlutuante))).toHaveLength(1);
    });

    it("abre a página na seção atual e fecha a consulta", () => {
        const { fixture, consulta, memoria } = montar();
        consulta.abrir();
        fixture.detectChanges();
        memoria.lembrarSecao("sistema", "inventario");
        const navegar = vi.spyOn(TestBed.inject(Router), "navigate")
            .mockResolvedValue(true);
        fixture.nativeElement.querySelector('[aria-label="Abrir página de Regras"]').click();
        expect(navegar).toHaveBeenCalledWith(["/regras", "sistema"], {
            fragment: "inventario",
        });
        expect(consulta.aberto()).toBe(false);
    });

    it("maximiza abaixo da topbar e restaura o tamanho confinado", () => {
        const { fixture, consulta, leitor } = montar();
        consulta.abrir();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('[aria-label="Maximizar Regras"]').click();
        fixture.detectChanges();
        const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
            .componentInstance as PainelFlutuante;
        expect(leitor()?.maximizada()).toBe(true);
        expect(painel.obterPosicaoAtual()).toEqual({ x: 0, y: 56 });
        expect(painel.altura()).toBe(window.innerHeight - 56);
        fixture.nativeElement.querySelector('[aria-label="Restaurar tamanho das Regras"]').click();
        fixture.detectChanges();
        expect(leitor()?.maximizada()).toBe(false);
        expect(painel.largura()).toBeLessThanOrEqual(window.innerWidth);
    });

    it("usa folha cheia no celular e não oferece maximização", () => {
        const largura = window.innerWidth;
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
        try {
            const { fixture, consulta } = montar();
            consulta.abrir();
            fixture.detectChanges();
            const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
                .componentInstance as PainelFlutuante;
            expect(painel.mobile()).toBe(true);
            expect(painel.largura()).toBeNull();
            expect(fixture.nativeElement.querySelector('[aria-label="Maximizar Regras"]'))
                .toBeNull();
            expect(fixture.nativeElement.querySelector("[painelRedimensionar]")).toBeNull();
        } finally {
            Object.defineProperty(window, "innerWidth", { configurable: true, value: largura });
        }
    });

    it("redimensiona a partir da caixa real e restaura o tamanho escolhido após maximizar", () => {
        const { fixture, consulta } = montar();
        consulta.abrir(); fixture.detectChanges();
        const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
            .componentInstance as PainelFlutuante;
        vi.spyOn(painel, "obterElemento").mockReturnValue({ getBoundingClientRect: () => ({
            left: 40, top: 80, width: 600, height: 500,
        }) } as HTMLElement);
        const alca = fixture.debugElement.query(By.css("[painelRedimensionar]"));
        expect(alca).not.toBeNull();
        alca.triggerEventHandler("pointerdown", {
            button: 0, pointerId: 1, clientX: 640, clientY: 580,
            preventDefault: vi.fn(), stopPropagation: vi.fn(),
        });
        window.dispatchEvent(new MouseEvent("pointermove", { clientX: 720, clientY: 620 }));
        window.dispatchEvent(new MouseEvent("pointerup"));
        fixture.detectChanges();
        expect(painel.largura()).toBe(680);
        expect(painel.altura()).toBe(540);
        fixture.nativeElement.querySelector('[aria-label="Maximizar Regras"]').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector("[painelRedimensionar]")).toBeNull();
        fixture.nativeElement.querySelector('[aria-label="Restaurar tamanho das Regras"]').click();
        fixture.detectChanges();
        expect(painel.largura()).toBe(680);
        expect(painel.altura()).toBe(540);
    });

    it("limita o arraste à área livre e encerra ao cancelar o ponteiro", () => {
        const { fixture, consulta } = montar();
        consulta.abrir(); fixture.detectChanges();
        const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
            .componentInstance as PainelFlutuante;
        vi.spyOn(painel, "obterElemento").mockReturnValue({ getBoundingClientRect: () => ({
            left: 100, top: 80, width: 600, height: 500,
        }) } as HTMLElement);
        const alca = fixture.debugElement.query(By.css("[painelRedimensionar]"));
        expect(alca).not.toBeNull();
        alca.triggerEventHandler("pointerdown", {
            button: 0, pointerId: 1, clientX: 700, clientY: 580,
            preventDefault: vi.fn(), stopPropagation: vi.fn(),
        });
        window.dispatchEvent(new MouseEvent("pointermove", { clientX: 9999, clientY: 9999 }));
        fixture.detectChanges();
        expect(painel.largura()).toBe(window.innerWidth - 100);
        expect(painel.altura()).toBe(window.innerHeight - 80);
        window.dispatchEvent(new MouseEvent("pointermove", { clientX: -9999, clientY: -9999 }));
        fixture.detectChanges();
        expect(painel.largura()).toBe(360);
        expect(painel.altura()).toBe(360);
        window.dispatchEvent(new MouseEvent("pointercancel"));
        window.dispatchEvent(new MouseEvent("pointermove", { clientX: 9999, clientY: 9999 }));
        fixture.detectChanges();
        expect(painel.largura()).toBe(360);
    });

    it("restaura dentro da tela quando o viewport diminui durante a maximização", () => {
        const dimensoes = { largura: window.innerWidth, altura: window.innerHeight };
        const definirViewport = (largura: number, altura: number) => {
            Object.defineProperty(window, "innerWidth", { configurable: true, value: largura });
            Object.defineProperty(window, "innerHeight", { configurable: true, value: altura });
        };
        try {
            definirViewport(1920, 1080);
            const { fixture, consulta } = montar();
            consulta.abrir(); fixture.detectChanges();
            const painel = fixture.debugElement.query(By.directive(PainelFlutuante))
                .componentInstance as PainelFlutuante;
            painel.moverPara({ x: 1000, y: 300 });
            fixture.nativeElement.querySelector('[aria-label="Maximizar Regras"]').click();
            fixture.detectChanges();
            definirViewport(800, 700);
            window.dispatchEvent(new Event("resize"));
            fixture.detectChanges();
            fixture.nativeElement.querySelector('[aria-label="Restaurar tamanho das Regras"]').click();
            fixture.detectChanges();
            expect(painel.obterPosicaoAtual()).toEqual({ x: 40, y: 56 });
            expect(painel.largura()).toBe(760);
            expect(painel.altura()).toBe(644);
        } finally {
            definirViewport(dimensoes.largura, dimensoes.altura);
        }
    });
});
