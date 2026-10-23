import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { RegrasMudancasPublicadasService } from "./regras-mudancas-publicadas.service";

describe("RegrasMudancasPublicadasService", () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    }));
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it("consulta o recorte público sem origem por padrão e sem cache de publicações", () => {
        const servico = TestBed.inject(RegrasMudancasPublicadasService);
        const http = TestBed.inject(HttpTestingController);
        for (let tentativa = 0; tentativa < 2; tentativa++) {
            const recebido = vi.fn();
            servico.recuperarMudancas({ codigo: "sistema" }).subscribe(recebido);
            const requisicao = http.expectOne("/livros/sistema/mudancas");
            expect(requisicao.request.method).toBe("GET");
            requisicao.flush({ dados: { codigo: "sistema" } });
            expect(recebido).toHaveBeenCalledWith({ codigo: "sistema" });
        }
    });

    it("envia a origem escolhida e propaga erro para a tela oferecer nova tentativa", () => {
        const erro = vi.fn();
        TestBed.inject(RegrasMudancasPublicadasService).recuperarMudancas({ codigo: "guia", origemId: 7 }).subscribe({ error: erro });
        TestBed.inject(HttpTestingController).expectOne("/livros/guia/mudancas?origemId=7")
            .flush({}, { status: 404, statusText: "Not Found" });
        expect(erro).toHaveBeenCalledOnce();
    });
});
