import { HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import type { RegrasDocumento } from "./regras.model";
import { RegrasService } from "./regras.service";

const sistema: RegrasDocumento = {
    tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.3",
    filhos: [{
        tipo: "secao", nivel: 1, glifo: "⬢", titulo: "Agentes", ancora: "agentes", filhos: [],
    }],
};
const guia: RegrasDocumento = {
    tipo: "documento", id: "guia", titulo: "Guia de Mestre", versao: "4.2.0", filhos: [],
};

describe("RegrasService", () => {
    let servico: RegrasService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        servico = TestBed.inject(RegrasService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTestingController.verify());

    it("carrega o JSON público sem envelope e preserva seus dados", () => {
        let recebido: RegrasDocumento | undefined;
        servico.carregarDocumento("sistema").subscribe((documento) => recebido = documento);

        const requisicao = httpTestingController.expectOne("/regras/sistema.json");
        expect(requisicao.request.method).toBe("GET");
        requisicao.flush(sistema);
        expect(recebido).toEqual(sistema);
    });

    it("compartilha uma única requisição entre leitores simultâneos", () => {
        const recebidos: RegrasDocumento[] = [];
        servico.carregarDocumento("sistema").subscribe((documento) => recebidos.push(documento));
        servico.carregarDocumento("sistema").subscribe((documento) => recebidos.push(documento));

        httpTestingController.expectOne("/regras/sistema.json").flush(sistema);
        expect(recebidos).toEqual([sistema, sistema]);
    });

    it("reutiliza o sucesso em memória e mantém caches separados por livro", () => {
        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectOne("/regras/sistema.json").flush(sistema);
        servico.carregarDocumento("guia").subscribe();
        httpTestingController.expectOne("/regras/guia.json").flush(guia);

        const recebidos: RegrasDocumento[] = [];
        servico.carregarDocumento("sistema").subscribe((documento) => recebidos.push(documento));
        servico.carregarDocumento("guia").subscribe((documento) => recebidos.push(documento));
        httpTestingController.expectNone("/regras/sistema.json");
        httpTestingController.expectNone("/regras/guia.json");
        expect(recebidos).toEqual([sistema, guia]);
    });

    it("propaga a falha aos leitores e permite tentar novamente sem envenenar o cache", () => {
        const erros: HttpErrorResponse[] = [];
        servico.carregarDocumento("sistema").subscribe({ error: (erro) => erros.push(erro) });
        servico.carregarDocumento("sistema").subscribe({ error: (erro) => erros.push(erro) });
        httpTestingController.expectOne("/regras/sistema.json").flush("Indisponível", {
            status: 503, statusText: "Service Unavailable",
        });
        expect(erros.map((erro) => erro.status)).toEqual([503, 503]);

        let recebido: RegrasDocumento | undefined;
        servico.carregarDocumento("sistema").subscribe((documento) => recebido = documento);
        httpTestingController.expectOne("/regras/sistema.json").flush(sistema);
        expect(recebido).toEqual(sistema);
        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectNone("/regras/sistema.json");
    });

    it("termina e conserva a leitura iniciada mesmo quando o leitor troca de rota", () => {
        const assinatura = servico.carregarDocumento("sistema").subscribe();
        const requisicao = httpTestingController.expectOne("/regras/sistema.json");
        assinatura.unsubscribe();
        expect(requisicao.cancelled).toBe(false);
        requisicao.flush(sistema);

        let recebido: RegrasDocumento | undefined;
        servico.carregarDocumento("sistema").subscribe((documento) => recebido = documento);
        httpTestingController.expectNone("/regras/sistema.json");
        expect(recebido).toEqual(sistema);
    });
});
