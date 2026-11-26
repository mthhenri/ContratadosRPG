import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ErrorHandler } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { environment } from "../../../environments/environment";
import { TemaService } from "../../core/services/tema.service";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";
import { ICONES_DO_PDF } from "./pdf/icones";
import type { PedidoDeLivro } from "./pdf/gerar-livro";
import { GERADOR_DE_LIVRO, RegrasExportacaoPdfService } from "./regras-exportacao-pdf.service";

const URL_PUBLICADA = `${environment.apiBase}/livros/sistema/publicada`;
const LIVRO = {
    numero: "4.1.5", situacao: "PUBLICADA", publicacaoData: null,
    conteudo: { codigo: "sistema", titulo: "Sistema", numero: "4.1.5", subtitulo: "", pecas: [] },
};
describe("RegrasExportacaoPdfService", () => {
    const pedidos: PedidoDeLivro[] = [];
    const erros: unknown[] = [];
    let baixados: string[] = [];

    function montar(gerar: (pedido: PedidoDeLivro) => Blob = (pedido) => {
        pedidos.push(pedido);
        return new Blob(["pdf"]);
    }) {
        TestBed.configureTestingModule({ providers: [
            provideHttpClient(), provideHttpClientTesting(),
            {
                provide: ErrorHandler,
                useValue: { handleError: (erro: unknown) => erros.push(erro) },
            },
            { provide: GERADOR_DE_LIVRO, useValue: () => Promise.resolve(
                { FONTES_DO_PDF: ["a.ttf", "b.ttf"], gerarLivroPdf: gerar }) },
        ] });
        return {
            service: TestBed.inject(RegrasExportacaoPdfService),
            http: TestBed.inject(HttpTestingController),
            avisos: TestBed.inject(NotificacaoService),
        };
    }

    /** Responde cada pedido assim que ele aparece, até a exportação terminar. */
    async function atender(http: HttpTestingController, fim: Promise<void>): Promise<string[]> {
        const urls: string[] = [];
        let terminou = false;
        void fim.then(() => terminou = true);
        while (!terminou) {
            for (const pedido of http.match(() => true)) {
                urls.push(pedido.request.url);
                if (pedido.request.url === URL_PUBLICADA) pedido.flush({ dados: LIVRO });
                else pedido.flush(new Uint8Array([1, 2, 3]).buffer);
            }
            await new Promise((resolver) => setTimeout(resolver, 10));
        }
        return urls;
    }

    beforeEach(() => {
        pedidos.length = 0;
        erros.length = 0;
        baixados = [];
        URL.createObjectURL = vi.fn(() => "blob:pdf");
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
            baixados.push(this.download);
        });
    });
    afterEach(() => vi.restoreAllMocks());

    it("gera o livro publicado com fontes, logo, ícones e o tema de quem exporta, e baixa", async () => {
        const { service, http } = montar();
        const tema = TestBed.inject(TemaService);
        tema.definirBase("claro");
        tema.selecionarPreset("azul");

        const fim = service.exportar("sistema");
        expect(service.exportando()).toBe(true);
        const urls = await atender(http, fim);

        expect(urls).toEqual(expect.arrayContaining(
            [URL_PUBLICADA, "fonts/pdf/a.ttf", "fonts/pdf/b.ttf", "logo-black.png"]));
        expect(pedidos).toHaveLength(1);
        expect(pedidos[0].documento).toMatchObject({ tipo: "documento", titulo: "Sistema", versao: "4.1.5" });
        expect(pedidos[0].fontes).toEqual({ "a.ttf": "AQID", "b.ttf": "AQID" });
        expect(pedidos[0].logo).toBe("data:image/png;base64,AQID");
        expect(Object.keys(pedidos[0].icones)).toEqual([...ICONES_DO_PDF]);
        expect(pedidos[0].icones["vida"].preenchido).toBe(true);
        expect(pedidos[0].icones["combatente"].preenchido).toBe(false);
        expect(pedidos[0].base).toBe("claro");
        expect(pedidos[0].destaque).toBe(tema.accentAplicado());
        expect(baixados).toEqual(["Contratados RPG - Sistema - v4.1.5.pdf"]);
        expect(service.exportando()).toBe(false);
    });

    it("usa o logo branco no tema escuro", async () => {
        const { service, http } = montar();
        TestBed.inject(TemaService).definirBase("escuro");
        const urls = await atender(http, service.exportar("sistema"));
        expect(urls).toContain("logo-white.png");
    });

    it("avisa que está gerando e troca o aviso pelo de sucesso", async () => {
        const { service, http, avisos } = montar();
        const fim = service.exportar("sistema");
        expect(avisos.fila().map((aviso) => aviso.resumo)).toEqual(["Gerando o PDF…"]);
        await atender(http, fim);
        expect(avisos.fila().filter((aviso) => !aviso.saindo).map((aviso) => aviso.resumo))
            .toEqual(["PDF exportado"]);
    });

    it("ignora o segundo clique enquanto gera", async () => {
        const { service, http } = montar();
        const primeiro = service.exportar("sistema");
        await service.exportar("sistema");
        await atender(http, primeiro);
        expect(pedidos).toHaveLength(1);
    });

    it("avisa a falha, registra o motivo, não baixa nada e libera nova tentativa", async () => {
        const falha = new Error("bloco sem desenho");
        const { service, http, avisos } = montar(() => {
            throw falha;
        });
        await atender(http, service.exportar("sistema"));
        expect(baixados).toEqual([]);
        expect(erros).toEqual([falha]);
        expect(avisos.fila().at(-1)).toMatchObject({ severidade: "erro", resumo: "Não foi possível exportar" });
        expect(service.exportando()).toBe(false);
    });
});
