import { HttpErrorResponse, provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import type { LivroLeituraDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum, TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

import type { RegrasDocumento } from "./regras.model";
import { SessaoService } from "../../core/services/sessao.service";
import { RegrasService, type RegrasLeitura } from "./regras.service";

/** Fotografia mínima de um livro: uma seção com um parágrafo, com a âncora renomeada. */
function livroDaApi(situacao = TipoLivroVersaoSituacaoEnum.PUBLICADA): { dados: LivroLeituraDto } {
    return {
        dados: {
            codigo: "sistema", titulo: "Sistema", situacao, numero: "4.1.4",
            publicacaoData: "2026-10-10T00:00:00.000000Z",
            conteudo: {
                formato: 1, codigo: "sistema", titulo: "Sistema", subtitulo: "- Nova Era -",
                numero: "4.1.4",
                ancorasAntigas: { "agentes-velho": "agentes" },
                pecas: [{
                    identificador: "00000000-0000-4000-8000-000000000001", ancora: "agentes",
                    tipo: TipoRegraPecaEnum.SECAO, ordem: 0,
                    dados: { titulo: "Agentes", nivel: 1, glifo: null },
                    filhos: [{
                        identificador: "00000000-0000-4000-8000-000000000002", ancora: null,
                        tipo: TipoRegraPecaEnum.PARAGRAFO, ordem: 0,
                        dados: { trechos: [{ tipo: "texto", texto: "Olá" }] }, filhos: [],
                    }],
                }],
            },
        },
    };
}

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

    it("consulta a publicação oficial sem substituir o cache de leitura por papel", () => {
        let oficial: RegrasLeitura | undefined;
        servico.carregarLeitura("sistema").subscribe();
        httpTestingController.expectOne("/livros/sistema")
            .flush(livroDaApi(TipoLivroVersaoSituacaoEnum.RASCUNHO));
        servico.carregarPublicada({ codigo: "sistema" }).subscribe(leitura => oficial = leitura);
        httpTestingController.expectOne("/livros/sistema/publicada").flush(livroDaApi());
        expect(oficial?.situacao).toBe("PUBLICADA");
        expect(oficial?.ancorasAntigas).toEqual({ "agentes-velho": "agentes" });
        let leituraPorPapel: RegrasLeitura | undefined;
        servico.carregarLeitura("sistema").subscribe(leitura => leituraPorPapel = leitura);
        expect(leituraPorPapel?.situacao).toBe("RASCUNHO");
        httpTestingController.expectNone("/livros/sistema");
    });

    it("lê a fotografia da API e a projeta no formato do leitor", () => {
        let recebido: RegrasLeitura | undefined;
        servico.carregarLeitura("sistema").subscribe((leitura) => recebido = leitura);

        const requisicao = httpTestingController.expectOne("/livros/sistema");
        expect(requisicao.request.method).toBe("GET");
        requisicao.flush(livroDaApi());

        expect(recebido?.situacao).toBe("PUBLICADA");
        expect(recebido?.numero).toBe("4.1.4");
        expect(recebido?.ancorasAntigas).toEqual({ "agentes-velho": "agentes" });
        expect(recebido?.documento).toMatchObject({
            tipo: "documento", id: "sistema", titulo: "Sistema", versao: "4.1.4",
        });
        const secao = recebido?.documento.filhos.find((filho) => filho.tipo === "secao");
        expect(secao).toMatchObject({ titulo: "Agentes", ancora: "agentes" });
        expect(secao && "filhos" in secao ? secao.filhos : []).toEqual([
            { tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Olá" }] },
        ]);
    });

    it("indica quando o que veio é rascunho", () => {
        let recebido: RegrasLeitura | undefined;
        servico.carregarLeitura("sistema").subscribe((leitura) => recebido = leitura);
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi(TipoLivroVersaoSituacaoEnum.RASCUNHO));
        expect(recebido?.situacao).toBe("RASCUNHO");
    });

    it("sem fotografia na API (404), o erro aparece e não há JSON estático de reserva", () => {
        const erros: HttpErrorResponse[] = [];
        servico.carregarLeitura("sistema").subscribe({ error: (erro) => erros.push(erro) });
        httpTestingController.expectOne("/livros/sistema").flush("Não encontrado", { status: 404, statusText: "Not Found" });
        httpTestingController.expectNone("/regras/sistema.json");
        expect(erros.map((erro) => erro.status)).toEqual([404]);
    });

    it("com a API fora do ar (rede), o erro aparece em vez de cair em JSON", () => {
        let falhou = false;
        servico.carregarDocumento("sistema").subscribe({ error: () => falhou = true });
        httpTestingController.expectOne("/livros/sistema").error(new ProgressEvent("error"));
        httpTestingController.expectNone("/regras/sistema.json");
        expect(falhou).toBe(true);
    });

    it("compartilha uma única requisição entre leitores simultâneos", () => {
        const recebidos: RegrasDocumento[] = [];
        servico.carregarDocumento("sistema").subscribe((documento) => recebidos.push(documento));
        servico.carregarDocumento("sistema").subscribe((documento) => recebidos.push(documento));

        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
        expect(recebidos.map((documento) => documento.id)).toEqual(["sistema", "sistema"]);
    });

    it("reutiliza o sucesso em memória e mantém caches separados por livro", () => {
        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
        servico.carregarDocumento("guia").subscribe();
        httpTestingController.expectOne("/livros/guia").flush(livroDaApi());

        servico.carregarDocumento("sistema").subscribe();
        servico.carregarDocumento("guia").subscribe();
        httpTestingController.expectNone("/livros/sistema");
        httpTestingController.expectNone("/livros/guia");
    });

    it("erro da API aparece para todos os leitores e permite tentar novamente", () => {
        const erros: HttpErrorResponse[] = [];
        servico.carregarDocumento("sistema").subscribe({ error: (erro) => erros.push(erro) });
        servico.carregarDocumento("sistema").subscribe({ error: (erro) => erros.push(erro) });
        httpTestingController.expectOne("/livros/sistema").flush("x", { status: 502, statusText: "Bad Gateway" });
        httpTestingController.expectNone("/regras/sistema.json");
        expect(erros.map((erro) => erro.status)).toEqual([502, 502]);

        let recebido: RegrasDocumento | undefined;
        servico.carregarDocumento("sistema").subscribe((documento) => recebido = documento);
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
        expect(recebido?.id).toBe("sistema");
        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectNone("/livros/sistema");
    });

    it("a falha não fica guardada: a próxima abertura tenta a API de novo", () => {
        servico.carregarDocumento("sistema").subscribe({ error: () => undefined });
        httpTestingController.expectOne("/livros/sistema").flush("x", { status: 404, statusText: "Not Found" });

        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
    });

    it("invalidar a leitura faz a próxima abertura ler a API de novo", () => {
        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
        servico.invalidarLeitura("sistema");

        servico.carregarDocumento("sistema").subscribe();
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
    });

    it("trocar de sessão não reaproveita a leitura de outra (rascunho do tester não vaza)", () => {
        const sessao = TestBed.inject(SessaoService);
        let token: string | null = "token-tester";
        vi.spyOn(sessao, "obterToken").mockImplementation(() => token);

        let comoTester: RegrasLeitura | undefined;
        servico.carregarLeitura("sistema").subscribe((leitura) => comoTester = leitura);
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi(TipoLivroVersaoSituacaoEnum.RASCUNHO));
        expect(comoTester?.situacao).toBe("RASCUNHO");

        token = null;
        let comoVisitante: RegrasLeitura | undefined;
        servico.carregarLeitura("sistema").subscribe((leitura) => comoVisitante = leitura);
        httpTestingController.expectOne("/livros/sistema").flush(livroDaApi());
        expect(comoVisitante?.situacao).toBe("PUBLICADA");
    });

    it("termina e conserva a leitura iniciada mesmo quando o leitor troca de rota", () => {
        const assinatura = servico.carregarDocumento("sistema").subscribe();
        const requisicao = httpTestingController.expectOne("/livros/sistema");
        assinatura.unsubscribe();
        expect(requisicao.cancelled).toBe(false);
        requisicao.flush(livroDaApi());

        let recebido: RegrasDocumento | undefined;
        servico.carregarDocumento("sistema").subscribe((documento) => recebido = documento);
        httpTestingController.expectNone("/livros/sistema");
        expect(recebido?.id).toBe("sistema");
    });
});
