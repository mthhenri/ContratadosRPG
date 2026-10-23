import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { FormControl } from "@angular/forms";
import { LivroMudancaSituacaoEnum, LivroTextoOperacaoEnum } from "@contratados-rpg/shared/enums";
import { RegrasMudancasPublicadas } from "./regras-mudancas-publicadas.component";

const anterior = { id: 1, numero: "4.1.4", publicacaoData: "2026-10-01T12:00:00Z", nota: "" };
const atual = { id: 2, numero: "4.1.5", publicacaoData: "2026-10-02T12:00:00Z", nota: "# Revisão\n\n- **Item** [fonte](https://example.com)\n\n<script>mal()</script>[ruim](javascript:alert(1))" };
const resposta = () => ({ codigo: "sistema", titulo: "Sistema", publicacoes: [atual, anterior], origem: anterior, atual, notas: [atual], mudancas: [] });

describe("RegrasMudancasPublicadas", () => {
    it("explica a reordenação entre irmãs sem repetir o texto do bloco", () => {
        const { fixture, http, elemento } = preparar();
        http.expectOne("/livros/sistema/mudancas").flush({ dados: {
            ...resposta(), mudancas: [{
                identificador: "movida", situacao: LivroMudancaSituacaoEnum.MOVIDA,
                caminho: ["Agentes", "Parágrafo"], caminhoAnterior: ["Agentes", "Parágrafo"],
                antesMarkdown: null, depoisMarkdown: null, ancoraAtual: "agentes", campos: [],
                posicao: { paiAntes: "agentes", paiDepois: "agentes", ordemAntes: 0, ordemDepois: 2 },
            }],
        } });
        fixture.detectChanges();
        expect(elemento.textContent).toContain("Da posição 1 para a posição 3");
        expect(elemento.querySelectorAll("[data-lado]")).toHaveLength(0);
    });
    beforeEach(() => TestBed.configureTestingModule({
        imports: [RegrasMudancasPublicadas],
        providers: [provideHttpClient(), provideHttpClientTesting()],
    }));
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));
    function preparar(aberta = true) {
        const fixture = TestBed.createComponent(RegrasMudancasPublicadas);
        fixture.componentRef.setInput("codigo", "sistema");
        fixture.componentRef.setInput("aberta", aberta);
        fixture.detectChanges();
        return {
            fixture, http: TestBed.inject(HttpTestingController),
            elemento: fixture.nativeElement as HTMLElement,
        };
    }

    it("só busca aberta; cancela ao fechar, limpa e reconsulta ao reabrir", () => {
        const { fixture, http, elemento } = preparar(false);
        http.expectNone("/livros/sistema/mudancas");
        fixture.componentRef.setInput("aberta", true); fixture.detectChanges();
        const pendente = http.expectOne("/livros/sistema/mudancas");
        expect(elemento.textContent).toContain("Comparando publicações");
        fixture.componentRef.setInput("aberta", false); fixture.detectChanges();
        expect(pendente.cancelled).toBe(true);
        expect(elemento.textContent).not.toContain("4.1.5");
        fixture.componentRef.setInput("aberta", true); fixture.detectChanges();
        http.expectOne("/livros/sistema/mudancas").flush({ dados: resposta() });
    });

    it("apresenta notas seguras antes da comparação e preserva notas sem diferenças", () => {
        const { fixture, http, elemento } = preparar();
        http.expectOne("/livros/sistema/mudancas").flush({ dados: resposta() }); fixture.detectChanges();
        expect(elemento.querySelector("h1")?.textContent).toBe("Revisão");
        expect(elemento.querySelector(".mudancas-publicadas__markdown strong")?.textContent).toBe("Item");
        expect(elemento.querySelector("script, [href^='javascript:']")).toBeNull();
        expect(elemento.textContent).toContain("Sem alterações de conteúdo");
        expect(elemento.textContent!.indexOf("Revisão")).toBeLessThan(elemento.textContent!.indexOf("Sem alterações de conteúdo"));
    });

    it("trocar livro cancela a consulta antiga; erro oferece nova tentativa", () => {
        const { fixture, http, elemento } = preparar();
        const antiga = http.expectOne("/livros/sistema/mudancas");
        fixture.componentRef.setInput("codigo", "guia"); fixture.detectChanges();
        expect(antiga.cancelled).toBe(true);
        http.expectOne("/livros/guia/mudancas").flush({}, { status: 500, statusText: "Error" }); fixture.detectChanges();
        const botao = Array.from(elemento.querySelectorAll("button")).find(item => item.textContent?.includes("Tentar novamente"))!;
        botao.click(); fixture.detectChanges();
        http.expectOne("/livros/guia/mudancas").flush({ dados: { ...resposta(), codigo: "guia", origem: null, notas: [] } }); fixture.detectChanges();
        expect(elemento.textContent).toContain("Não existe publicação anterior");
    });

    it("mostra só o lado aplicável e navega somente quando a API oferece destino atual", () => {
        const { fixture, http, elemento } = preparar();
        const navegar = vi.fn(); fixture.componentInstance.irPara.subscribe(navegar);
        http.expectOne("/livros/sistema/mudancas").flush({ dados: { ...resposta(), mudancas: [
            { identificador: "nova", situacao: LivroMudancaSituacaoEnum.NOVA, caminho: ["Agentes"], caminhoAnterior: null, antesMarkdown: null, depoisMarkdown: "Texto adicionado", ancoraAtual: "agentes", campos: [] },
            { identificador: "removida", situacao: LivroMudancaSituacaoEnum.REMOVIDA, caminho: ["Antiga"], caminhoAnterior: null, antesMarkdown: "Texto removido", depoisMarkdown: null, ancoraAtual: null, campos: [] },
        ] } }); fixture.detectChanges();
        expect(elemento.querySelectorAll("[data-lado='antes']")).toHaveLength(1);
        expect(elemento.querySelectorAll("[data-lado='depois']")).toHaveLength(1);
        const botoes = Array.from(elemento.querySelectorAll("button")).filter(item => item.textContent?.includes("Ir para"));
        expect(botoes).toHaveLength(1); botoes[0].click();
        expect(navegar).toHaveBeenCalledWith("agentes");
    });

    it("origens reativas usam id e data, cancelam seleções anteriores e mantêm destino atual", () => {
        const { fixture, http, elemento } = preparar();
        const terceira = { ...anterior, id: 3, numero: "4.1.4", publicacaoData: "2026-09-01T12:00:00Z" };
        http.expectOne("/livros/sistema/mudancas").flush({ dados: { ...resposta(), publicacoes: [atual, anterior, terceira] } }); fixture.detectChanges();
        const componente = fixture.componentInstance as unknown as {
            origem: FormControl<string | null>;
        };
        const origem = componente.origem;
        origem.setValue("3"); fixture.detectChanges();
        const antiga = http.expectOne("/livros/sistema/mudancas?origemId=3");
        origem.setValue("1"); fixture.detectChanges();
        expect(antiga.cancelled).toBe(true);
        http.expectOne("/livros/sistema/mudancas?origemId=1").flush({ dados: resposta() }); fixture.detectChanges();
        expect(elemento.textContent).toContain("4.1.5");
        expect(elemento.textContent).toContain("01/10/2026");
    });

    it("renderiza tabela e diff por palavras com formatação sem expor propriedades internas", () => {
        const { fixture, http, elemento } = preparar();
        http.expectOne("/livros/sistema/mudancas").flush({ dados: { ...resposta(), mudancas: [{
            identificador: "alterada", situacao: LivroMudancaSituacaoEnum.ALTERADA,
            caminho: ["Agentes", "Valores"], caminhoAnterior: ["Antigo", "Valores"],
            antesMarkdown: "| Vida |\n| --- |\n| 10 |", depoisMarkdown: "| Vida |\n| --- |\n| 12 |",
            ancoraAtual: "valores", campos: [{ campo: "trechos.0.texto", antes: [], depois: [], texto: [
                { operacao: LivroTextoOperacaoEnum.REMOVIDO, texto: "10" },
                { operacao: LivroTextoOperacaoEnum.ADICIONADO, texto: "12" },
                { operacao: LivroTextoOperacaoEnum.FORMATACAO, texto: "Vida" },
            ] }],
        }] } }); fixture.detectChanges();
        expect(elemento.querySelectorAll("table")).toHaveLength(2);
        expect(elemento.querySelector("del")?.textContent).toBe("10");
        expect(elemento.querySelector("ins")?.textContent).toBe("12");
        expect(elemento.querySelector(".mudancas-publicadas__formatacao")?.textContent).toBe("Vida");
        expect(elemento.textContent).toContain("Antigo › Valores → Agentes › Valores");
        expect(elemento.textContent).not.toContain("trechos.0.texto");
    });
});
