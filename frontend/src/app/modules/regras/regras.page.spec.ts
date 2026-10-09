import { Location } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { BehaviorSubject, Subject } from "rxjs";

import { RegrasDocumento } from "./regras.model";
import { RegrasPage } from "./regras.page";
import { RegrasService } from "./regras.service";

describe("RegrasPage", () => {
    const sistema: RegrasDocumento = {
        tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.4",
        filhos: [{ tipo: "secao", ancora: "vida", titulo: "Vida", nivel: 2,
            glifo: "⬡", filhos: [{ tipo: "paragrafo", trechos: [
                { tipo: "texto", texto: "Conteúdo do livro" },
            ] }] }],
    };

    async function montar() {
        const respostas = {
            sistema: new Subject<RegrasDocumento>(), guia: new Subject<RegrasDocumento>(),
        };
        const carregar = vi.fn((id: RegrasDocumento["id"]) => respostas[id]);
        const location = { path: () => "/regras/sistema", getState: () => null,
            replaceState: vi.fn() };
        await TestBed.configureTestingModule({ imports: [RegrasPage], providers: [
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { fragment: new BehaviorSubject(null) } },
            { provide: RegrasService, useValue: { carregarDocumento: carregar } },
            { provide: Location, useValue: location },
        ] }).compileComponents();
        vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        const fixture = TestBed.createComponent(RegrasPage);
        fixture.componentRef.setInput("livro", "sistema");
        fixture.detectChanges();
        return { fixture, respostas, carregar, raiz: fixture.nativeElement as HTMLElement };
    }

    afterEach(() => vi.restoreAllMocks());

    it("anuncia carga e exibe versão, conteúdo, exportação suspensa e atribuição do documento recebido",
        async () => {
            const { fixture, respostas, raiz } = await montar();
            expect(raiz.querySelector('[aria-label="Carregando documento"]')).not.toBeNull();
            respostas.sistema.next(sistema);
            fixture.detectChanges();
            expect(raiz.querySelector("h1")?.textContent).toContain("Sistema · v4.1.4");
            expect(raiz.textContent).toContain("Conteúdo do livro");
            expect(raiz.querySelector("a[download]")).toBeNull();
            expect(raiz.querySelector<HTMLButtonElement>('[aria-label="Exportar PDF"]')?.disabled)
                .toBe(true);
            expect(raiz.querySelector("footer")?.textContent).toContain("CC BY-SA 3.0");
        });

    it("permite nova tentativa após erro de carga", async () => {
        const { fixture, respostas, raiz, carregar } = await montar();
        respostas.sistema.error(new Error("offline"));
        fixture.detectChanges();
        expect(raiz.textContent).toContain("Não foi possível carregar");
        raiz.querySelector<HTMLButtonElement>("app-estado-vazio button")!.click();
        fixture.detectChanges();
        expect(carregar).toHaveBeenCalledTimes(2);
    });

    it("a troca de documento descarta resposta atrasada do anterior", async () => {
        const { fixture, respostas, raiz } = await montar();
        fixture.componentRef.setInput("livro", "guia");
        fixture.detectChanges();
        respostas.sistema.next(sistema);
        respostas.guia.next({ ...sistema, id: "guia", titulo: "Guia", versao: "4.2.0" });
        fixture.detectChanges();
        expect(raiz.querySelector("h1")?.textContent).toContain("Guia · v4.2.0");
        expect(raiz.querySelector("a[download]")).toBeNull();
        expect(raiz.querySelector<HTMLButtonElement>('[aria-label="Exportar PDF"]')?.disabled)
            .toBe(false);
    });
});
