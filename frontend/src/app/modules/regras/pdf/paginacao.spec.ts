import { type Geometria, type Grupo, type Peca, paginar } from "./paginacao";

/** Região útil de 100 mm de altura (topo 10) e 100 mm de largura: contas de cabeça. */
const GEOMETRIA: Geometria = { esquerda: 10, topo: 10, base: 110, largura: 100, vao: 4 };

function peca(nome: string, altura: number, extras: Partial<Peca> = {}): Peca & { nome: string } {
    return { nome, altura, desenhar: () => undefined, ...extras };
}

function nomes(grupos: readonly Grupo[]): string[][] {
    return paginar(grupos, GEOMETRIA).map((pagina) =>
        pagina.postas.map((posta) => (posta.peca as Peca & { nome: string }).nome));
}

const fluxo = (pecas: Peca[], colunas: 1 | 2 | 3 = 1, extras: Partial<Grupo> = {}): Grupo =>
    ({ tipo: "fluxo", colunas, pecas, ...extras }) as Grupo;

describe("Paginação do PDF", () => {
    it("empilha em uma coluna e abre página quando não cabe", () => {
        expect(nomes([fluxo([peca("a", 60), peca("b", 30), peca("c", 20)])]))
            .toEqual([["a", "b"], ["c"]]);
    });

    it("ignora o espaço antes no topo da coluna", () => {
        const [primeira, segunda] = paginar(
            [fluxo([peca("a", 90), peca("b", 20, { espacoAntes: 8 })])], GEOMETRIA);
        expect(primeira.postas[0].y).toBe(10);
        expect(segunda.postas[0].y).toBe(10);
    });

    it("leva o título junto com o que vem depois", () => {
        expect(nomes([fluxo([peca("a", 80), peca("titulo", 10, { prenderProxima: true }),
            peca("corpo", 30)])])).toEqual([["a"], ["titulo", "corpo"]]);
    });

    it("leva o título junto com o primeiro item do grupo seguinte", () => {
        expect(nomes([
            fluxo([peca("a", 80), peca("titulo", 10, { prenderProxima: true })]),
            fluxo([peca("h1", 30), peca("h2", 30)], 2),
        ])).toEqual([["a"], ["titulo", "h1", "h2"]]);
    });

    it("mantém o título com o começo do texto mesmo que os dois juntos passem de uma página", () => {
        const presas = Array.from({ length: 6 }, (_, indice) =>
            peca(`l${indice}`, 20, { prenderProxima: indice < 5 }));
        const [primeira, segunda] = nomes([fluxo(
            [peca("a", 80), peca("titulo", 10, { prenderProxima: true }), ...presas])]);
        expect(primeira).toEqual(["a"]);
        expect(segunda.slice(0, 3)).toEqual(["titulo", "l0", "l1"]);
    });

    it("repete o cabeçalho da tabela na página seguinte", () => {
        const cabecalho = peca("cab", 10);
        const linha = (nome: string) => peca(nome, 40, { repetir: cabecalho });
        expect(nomes([fluxo([peca("cab", 10, { prenderProxima: true }),
            linha("l1"), linha("l2"), linha("l3")])]))
            .toEqual([["cab", "l1", "l2"], ["cab", "l3"]]);
    });

    it("equilibra as colunas de um grupo que termina no meio da página", () => {
        const [pagina] = paginar([
            fluxo([peca("a", 20), peca("b", 20), peca("c", 20), peca("d", 20)], 2),
            fluxo([peca("depois", 10)]),
        ], GEOMETRIA);
        expect(pagina.postas.map((posta) => [posta.x, posta.y])).toEqual(
            [[10, 10], [10, 30], [62, 10], [62, 30], [10, 50]]);
    });

    it("enche a primeira coluna antes da segunda quando o grupo passa de uma página", () => {
        const itens = Array.from({ length: 6 }, (_, indice) => peca(`p${indice}`, 45));
        expect(nomes([fluxo(itens, 2)])).toEqual([["p0", "p1", "p2", "p3"], ["p4", "p5"]]);
    });

    it("continua cada coluna paralela por conta própria", () => {
        const paginas = paginar([{ tipo: "paralelo", colunas: [
            [peca("a1", 60), peca("a2", 60)],
            [peca("b1", 40)],
            [peca("c1", 60), peca("c2", 30), peca("c3", 30)],
        ] }], GEOMETRIA);
        expect(paginas.map((pagina) => pagina.postas.map((posta) =>
            (posta.peca as Peca & { nome: string }).nome)))
            .toEqual([["a1", "b1", "c1", "c2"], ["a2", "c3"]]);
    });

    it("dá o respiro antes das colunas paralelas que começam no meio da página", () => {
        const [pagina] = paginar([
            fluxo([peca("titulo", 10)]),
            { tipo: "paralelo", colunas: [[peca("a", 10, { espacoAntes: 6 })], [peca("b", 10)]] },
        ], GEOMETRIA);
        expect(pagina.postas.map((posta) => posta.y)).toEqual([10, 26, 26]);
    });

    it("começa página nova quando o grupo pede e guarda o capítulo", () => {
        const paginas = paginar([
            fluxo([peca("a", 10)], 1, { capitulo: "Introdução" }),
            fluxo([peca("b", 10)], 1, { novaPagina: true, capitulo: "Regras" }),
        ], GEOMETRIA);
        expect(paginas.map((pagina) => pagina.capitulo)).toEqual(["Introdução", "Regras"]);
    });

    it("não deixa página em branco quando o primeiro grupo pede página nova", () => {
        expect(nomes([fluxo([peca("a", 10)], 1, { novaPagina: true })])).toEqual([["a"]]);
    });

    it("parte a peça que é mais alta que a coluna", () => {
        const grande = peca("grande", 250, {
            partir: () => [peca("g1", 90), peca("g2", 90), peca("g3", 70)],
        });
        expect(nomes([fluxo([grande])])).toEqual([["g1"], ["g2"], ["g3"]]);
    });

    it("não trava com peça alta demais que não sabe se partir", () => {
        expect(nomes([fluxo([peca("a", 10), peca("enorme", 500), peca("b", 10)])]))
            .toEqual([["a"], ["enorme"], ["b"]]);
    });

    it("informa em que página ficou cada âncora", () => {
        const paginas = paginar([fluxo([peca("a", 90, { ancoras: ["um"] }),
            peca("b", 90, { ancoras: ["dois"] })])], GEOMETRIA);
        expect(paginas.map((pagina) => pagina.postas.flatMap((posta) => posta.peca.ancoras ?? [])))
            .toEqual([["um"], ["dois"]]);
    });
});
