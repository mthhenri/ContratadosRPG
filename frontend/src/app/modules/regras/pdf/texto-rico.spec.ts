import { PALETA_PDF } from "./paleta";
import { PincelFalso } from "./pincel-falso";
import type { EstiloTexto } from "./pincel";
import {
    desenharLinha, medirTexto, pecasDeTexto, quebrarEquilibrado, quebrarLinhas, trechosEmCorridas,
} from "./texto-rico";

/** 10 pt no pincel falso: 1,76389 mm por letra. */
const BASE: EstiloTexto = { familia: "sans", tamanho: 10, cor: PALETA_PDF.texto };
const LETRA = 10 * 0.352778 * 0.5;
const contexto = (pincel: PincelFalso) => ({ pincel, paginaDaAncora: () => 7 });
const textoDe = (linha: { segmentos: readonly { texto: string }[] }) =>
    linha.segmentos.map((segmento) => segmento.texto).join("");

describe("Texto rico do PDF", () => {
    const pincel = new PincelFalso();

    it("quebra por palavra na largura pedida, sem espaço sobrando no fim", () => {
        const corridas = trechosEmCorridas([{ tipo: "texto", texto: "um dois três" }], BASE);
        expect(quebrarLinhas(pincel, corridas, LETRA * 9).map(textoDe)).toEqual(["um dois", "três"]);
    });

    it("respeita a quebra de linha do próprio texto, inclusive a linha vazia", () => {
        const corridas = trechosEmCorridas([{ tipo: "texto", texto: "a\n\nb" }], BASE);
        expect(quebrarLinhas(pincel, corridas, 100).map(textoDe)).toEqual(["a", "", "b"]);
    });

    it("soma negrito e itálico aninhados", () => {
        const [corrida] = trechosEmCorridas([{ tipo: "italico", filhos: [
            { tipo: "negrito", filhos: [{ tipo: "texto", texto: "forte" }] }] }], BASE);
        expect(corrida.estilo.negrito).toBe(true);
        expect(corrida.estilo.italico).toBe(true);
    });

    it("pinta Vida e Energia e sublinha condição", () => {
        const corridas = trechosEmCorridas(
            [{ tipo: "texto", texto: "Vida e Energia; fica Inconsciente" }], BASE);
        const de = (texto: string) => corridas.find((corrida) => corrida.texto === texto);
        expect(de("Vida")?.estilo.cor).toEqual(PALETA_PDF.vida);
        expect(de("Energia")?.estilo.cor).toEqual(PALETA_PDF.energia);
        expect(de("Inconsciente")?.sublinhado).toBe(true);
    });

    it("tarja ocupa a largura pedida e não escreve texto", () => {
        const falso = new PincelFalso();
        const [linha] = quebrarLinhas(falso, trechosEmCorridas([{ tipo: "tarja", comprimento: 4 }], BASE), 100);
        expect(linha.largura).toBeCloseTo(LETRA * 4);
        desenharLinha(contexto(falso), linha, 0, 10);
        expect(falso.textos).toEqual([]);
        expect(falso.retangulos).toBe(1);
    });

    it("parte a palavra que não cabe sozinha na linha", () => {
        const corridas = trechosEmCorridas([{ tipo: "texto", texto: "abcdefghij" }], BASE);
        expect(quebrarLinhas(pincel, corridas, LETRA * 4.5).map(textoDe)).toEqual(["abcd", "efgh", "ij"]);
    });

    it("desenha como figura o glifo que a fonte não tem", () => {
        const falso = new PincelFalso();
        const [linha] = quebrarLinhas(falso, trechosEmCorridas([{ tipo: "texto", texto: "a ■□ b" }], BASE), 100);
        desenharLinha(contexto(falso), linha, 0, 10);
        expect(falso.textos.join("")).not.toContain("■");
        expect(falso.textos.join("")).not.toContain("□");
        expect(falso.poligonos).toBe(2);
    });

    it("torna clicável o link interno para a página da âncora", () => {
        const falso = new PincelFalso();
        const [linha] = quebrarLinhas(falso, trechosEmCorridas(
            [{ tipo: "link-interno", texto: "Regras Gerais", ancora: "gerais" }], BASE), 100);
        desenharLinha(contexto(falso), linha, 0, 10);
        expect(falso.linksDePagina).toContain(7);
    });

    it("equilibra as linhas de cada frase, mantendo as quebras e a linha vazia", () => {
        const corridas = trechosEmCorridas([{ tipo: "texto", texto: "aa bb cc dd ee\n\nff" }], BASE);
        expect(quebrarLinhas(pincel, corridas, LETRA * 11.5).map(textoDe))
            .toEqual(["aa bb cc dd", "ee", "", "ff"]);
        expect(quebrarEquilibrado(pincel, corridas, LETRA * 11.5).map(textoDe))
            .toEqual(["aa bb cc", "dd ee", "", "ff"]);
    });

    it("conta o espaçamento entre letras na largura", () => {
        expect(medirTexto(pincel, "abcd", { ...BASE, espacamento: 0.5 })).toBeCloseTo(LETRA * 4 + 2);
    });

    const presas = (texto: string, largura: number) => pecasDeTexto(
        pincel, trechosEmCorridas([{ tipo: "texto", texto }], BASE), largura)
        .map((peca) => !!peca.prenderProxima);

    it("pinta só a cor no nível de ameaça compacto, no corpo do texto e podendo quebrar", () => {
        const falso = new PincelFalso();
        const corridas = trechosEmCorridas([{ tipo: "nivel-ameaca", nivel: 1, compacto: true,
            texto: "ameaças Nulas" }], BASE);
        expect(corridas[0].selo).toBeFalsy();
        expect(corridas[0].estilo).toMatchObject({ familia: "sans", tamanho: 10 });
        const linhas = quebrarLinhas(falso, corridas, LETRA * 8);
        expect(linhas.map(textoDe)).toEqual(["ameaças", "Nulas"]);
        desenharLinha(contexto(falso), linhas[0], 0, 10);
        expect(falso.retangulos).toBe(1);
    });

    it("não parte um parágrafo entre colunas; a quebra do próprio texto pode separar", () => {
        expect(presas("aa bb cc\ndd ee", LETRA * 2.5)).toEqual([true, true, false, true, false]);
    });

    it("prende ao que vem depois o texto que o anuncia com dois-pontos", () => {
        expect(presas("aa\nbb cc:", LETRA * 3.5)).toEqual([false, true, true]);
    });

    /** Onde termina, na horizontal, cada pedaço escrito na altura `y`. */
    const fins = (falso: PincelFalso, y: number) => falso.posicoes
        .filter((posicao) => posicao.y === y)
        .map((posicao) => posicao.x + medirTexto(falso, posicao.texto, posicao.estilo));

    it("justifica a linha que o texto encheu, não a última nem a que quebra de propósito", () => {
        const falso = new PincelFalso();
        const largura = LETRA * 9;
        const pecas = pecasDeTexto(falso, trechosEmCorridas(
            [{ tipo: "texto", texto: "aa bb cc dd\nee ff" }], BASE), largura, { justificar: true });
        pecas.forEach((peca, indice) => peca.desenhar(contexto(falso), 0, indice * 100));
        const ultimoFim = (indice: number) => Math.max(...fins(falso, falso.posicoes.filter(
            (posicao) => Math.floor(posicao.y / 100) === indice)[0].y));
        expect(ultimoFim(0)).toBeCloseTo(largura);
        expect(ultimoFim(1)).toBeCloseTo(LETRA * 2);
        expect(ultimoFim(2)).toBeCloseTo(LETRA * 5);
    });

    it("não abre vãos enormes para justificar uma linha curta", () => {
        const falso = new PincelFalso();
        const pecas = pecasDeTexto(falso, trechosEmCorridas(
            [{ tipo: "texto", texto: "a b cccccccccccccccccccc" }], BASE), LETRA * 20, { justificar: true });
        pecas[0].desenhar(contexto(falso), 0, 0);
        expect(Math.max(...falso.posicoes.map((posicao) => posicao.x))).toBeLessThan(LETRA * 4);
    });
});
