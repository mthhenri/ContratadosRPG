import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { LivroPacoteDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { SessaoService } from "../../../core/services/sessao.service";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { OficinaExportar } from "./oficina-exportar.component";
import { OficinaExportacaoService } from "./oficina-exportacao.service";

const pacote: LivroPacoteDto = {
    formato: 1, exportacaoData: "2026-10-22T20:00:00Z", livros: [], sha256: "a".repeat(64),
};

describe("OficinaExportar", () => {
    const usuario = signal<{ tipo: TipoUsuarioEnum } | null>({ tipo: TipoUsuarioEnum.ADMIN });
    const notificar = vi.fn();
    beforeEach(() => {
        usuario.set({ tipo: TipoUsuarioEnum.ADMIN });
        notificar.mockClear();
        TestBed.configureTestingModule({
            imports: [OficinaExportar],
            providers: [provideHttpClient(), provideHttpClientTesting(),
                { provide: SessaoService, useValue: { usuario } },
                { provide: NotificacaoService, useValue: { notificar } },
            ],
        });
    });
    afterEach(() => { TestBed.inject(HttpTestingController).verify(); vi.restoreAllMocks(); });

    it("baixa o pacote retornado e bloqueia cliques durante a consulta", () => {
        const baixar = vi.spyOn(OficinaExportacaoService.prototype, "baixarPacote")
            .mockImplementation(() => {});
        const fixture = TestBed.createComponent(OficinaExportar); fixture.detectChanges();
        const botao = fixture.nativeElement.querySelector("button") as HTMLButtonElement;
        expect(botao?.textContent).toContain("Exportar livros publicados");
        botao.click(); fixture.detectChanges(); botao.click();
        expect(botao.disabled).toBe(true);
        TestBed.inject(HttpTestingController).expectOne("/livros/pacotes/publicados")
            .flush({ dados: pacote }); fixture.detectChanges();
        expect(baixar).toHaveBeenCalledWith(pacote);
        expect(botao.disabled).toBe(false);
        expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ severidade: "sucesso" }));
    });

    it("falha não baixa arquivo e permite nova tentativa", () => {
        const baixar = vi.spyOn(OficinaExportacaoService.prototype, "baixarPacote")
            .mockImplementation(() => {});
        const fixture = TestBed.createComponent(OficinaExportar); fixture.detectChanges();
        const botao = fixture.nativeElement.querySelector("button") as HTMLButtonElement;
        expect(botao).not.toBeNull(); botao.click();
        const http = TestBed.inject(HttpTestingController);
        http.expectOne("/livros/pacotes/publicados")
            .flush({}, { status: 503, statusText: "Unavailable" }); fixture.detectChanges();
        expect(baixar).not.toHaveBeenCalled(); expect(botao.disabled).toBe(false);
        expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ severidade: "erro" }));
        botao.click(); http.expectOne("/livros/pacotes/publicados").flush({ dados: pacote });
        expect(baixar).toHaveBeenCalledOnce();
    });

    it.each([null, TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER])(
        "não oferece exportação para %s", tipo => {
            usuario.set(tipo ? { tipo } : null);
            const fixture = TestBed.createComponent(OficinaExportar); fixture.detectChanges();
            expect(fixture.nativeElement.querySelector("button")).toBeNull();
            TestBed.inject(HttpTestingController).expectNone("/livros/pacotes/publicados");
        },
    );
});

describe("OficinaExportacaoService", () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    }));
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it("consulta pacote administrativo sem usar o livro ou rascunho aberto", () => {
        const resultados: LivroPacoteDto[] = [];
        TestBed.inject(OficinaExportacaoService).recuperarPacote()
            .subscribe(resultado => resultados.push(resultado));
        const requisicao = TestBed.inject(HttpTestingController)
            .expectOne("/livros/pacotes/publicados");
        expect(requisicao.request.method).toBe("GET");
        requisicao.flush({ dados: pacote }); expect(resultados).toEqual([pacote]);
    });
});
