import type { RegrasClasse, RegrasConteudo, RegrasSecao, RegrasSubclasse } from "./regras.model";
import { construirSumarioRegras, listarAncorasRegras } from "./regras-sumario";

function secao(
    nivel: RegrasSecao["nivel"],
    ancora: string,
    titulo: string,
    filhos: readonly RegrasConteudo[] = [],
): RegrasSecao {
    const glifos = ["⬢", "⬡", "⬥", "⬦"] as const;
    return { tipo: "secao", nivel, glifo: glifos[nivel - 1], ancora, titulo, filhos };
}

describe("sumário das Regras", () => {
    it("inclui dossiês sob sua seção, com destinos na ordem da leitura", () => {
        const classe: RegrasClasse = { tipo: "classe", nome: "Combatente", ancora: "combatente",
            citacao: [], cabecalho: [], linhas: [], habilidades: [], arquetipos: [],
            saude: { vida: [], energia: [] }, progressao: { vida: [], energia: [] },
            filhos: [{ tipo: "arquetipos", classe: "Combatente", arquetipos: [],
                cabecalho: [], linhas: [] }] };
        const subclasse: RegrasSubclasse = { tipo: "subclasse", nome: "Experimento Híbrido",
            ancora: "experimento-hibrido", classe: "Suporte", citacao: [], custos: [],
            cabecalho: [], linhas: [], saude: { vida: [], energia: [] },
            progressao: { vida: [], energia: [] }, atributosBonus: [], habilidades: [],
            habilidadeInicial: { tipo: "paragrafo", trechos: [] } };
        const conteudo = [secao(2, "classes", "Classes e Arquétipos", [classe]),
            secao(2, "subclasse", "Subclasse", [subclasse])];
        expect(construirSumarioRegras(conteudo)).toEqual([
            { ancora: "classes", titulo: "Classes e Arquétipos", nivel: 2, filhos: [
                { ancora: "combatente", titulo: "Combatente", nivel: 3, filhos: [] },
            ] },
            { ancora: "subclasse", titulo: "Subclasse", nivel: 2, filhos: [
                { ancora: "experimento-hibrido", titulo: "Experimento Híbrido",
                    nivel: 3, filhos: [] },
            ] },
        ]);
        expect(listarAncorasRegras(conteudo)).toEqual([
            "classes", "combatente", "subclasse", "experimento-hibrido",
        ]);
        expect(construirSumarioRegras([{ ...classe, ancora: undefined }])).toEqual([]);
        expect(listarAncorasRegras([{ ...subclasse, ancora: undefined }])).toEqual([]);
    });

    it("mantém ordem, títulos completos e árvore até ⬥, sem os verbetes ⬦", () => {
        const conteudo = [
            secao(1, "agentes", "AGENTES", [
                secao(2, "saude", "Saúde e recuperação", [
                    secao(3, "vida", "Vida máxima", [secao(4, "ferimentos", "Ferimentos")]),
                    secao(3, "energia", "Energia"),
                ]),
                secao(2, "progressao", "Progressão"),
            ]),
            secao(1, "ameacas", "AMEAÇAS"),
        ];
        expect(construirSumarioRegras(conteudo)).toEqual([
            { ancora: "agentes", titulo: "AGENTES", nivel: 1, filhos: [
                { ancora: "saude", titulo: "Saúde e recuperação", nivel: 2, filhos: [
                    { ancora: "vida", titulo: "Vida máxima", nivel: 3, filhos: [] },
                    { ancora: "energia", titulo: "Energia", nivel: 3, filhos: [] },
                ] },
                { ancora: "progressao", titulo: "Progressão", nivel: 2, filhos: [] },
            ] },
            { ancora: "ameacas", titulo: "AMEAÇAS", nivel: 1, filhos: [] },
        ]);
        expect(listarAncorasRegras(conteudo)).toEqual([
            "agentes", "saude", "vida", "ferimentos", "energia", "progressao", "ameacas",
        ]);
    });

    it("encontra seções em blocos com filhos e em listas sem criar itens fictícios", () => {
        const conteudo: readonly RegrasConteudo[] = [
            { tipo: "roteiro", etapas: [], filhos: [secao(2, "missao", "Criação de missão")] },
            { tipo: "lista", ordenada: false, inicio: 1, itens: [[{
                tipo: "generico", motivo: "trecho", origemMarkdown: "", trechos: [],
                filhos: [secao(3, "objetivo", "Objetivo", [secao(4, "segredo", "Segredo")])],
            }]] },
            { tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Sem título" }] },
        ];
        expect(construirSumarioRegras(conteudo)).toEqual([
            { ancora: "missao", titulo: "Criação de missão", nivel: 2, filhos: [] },
            { ancora: "objetivo", titulo: "Objetivo", nivel: 3, filhos: [] },
        ]);
        expect(listarAncorasRegras(conteudo)).toEqual(["missao", "objetivo", "segredo"]);
    });

    it("preserva seções sem glifo e níveis intermediários ausentes", () => {
        const conteudo = [{
            ...secao(1, "inicio", "Introdução", [secao(3, "visao", "Visão geral")]),
            glifo: null,
        }];
        expect(construirSumarioRegras(conteudo)).toEqual([{
            ancora: "inicio", titulo: "Introdução", nivel: 1,
            filhos: [{ ancora: "visao", titulo: "Visão geral", nivel: 3, filhos: [] }],
        }]);
    });

    it("não altera a fonte e aceita conteúdo vazio", () => {
        const conteudo = Object.freeze([Object.freeze(secao(2, "fonte", "⬡ Fonte integral"))]);
        expect(construirSumarioRegras(conteudo)[0].titulo).toBe("⬡ Fonte integral");
        expect(conteudo[0].titulo).toBe("⬡ Fonte integral");
        expect(construirSumarioRegras([])).toEqual([]);
        expect(listarAncorasRegras([])).toEqual([]);
    });
});
