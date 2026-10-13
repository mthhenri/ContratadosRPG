import type { LivroTrechoDto } from "@contratados-rpg/shared/dtos/livro";
import { describe, expect, it } from "vitest";

import { lerCustoDigitado } from "./oficina-custo";
import {
    apararQuebrasFinais, criarSeloNivel, detectarNivelAmeaca, dividirTrechos, lerSiglaNivel, lerTrechos, montarTrechos,
    normalizarTrechos, textoDe, textoNivelAmeaca, trechosIguais,
} from "./oficina-trechos";

const rico: LivroTrechoDto[] = [
    { tipo: "texto", texto: "Role " },
    { tipo: "negrito", filhos: [{ tipo: "texto", texto: "Vigor" }, { tipo: "italico", filhos: [{ tipo: "texto", texto: " forte" }] }] },
    { tipo: "texto", texto: " contra " },
    { tipo: "nivel-ameaca", nivel: 3, texto: "NA Médio [3]" },
    { tipo: "texto", texto: " e veja " },
    { tipo: "link-interno", texto: "Morrendo", ancora: "morrendo", identificador: "11111111-1111-4111-8111-111111111111" },
    { tipo: "tarja", comprimento: 6 },
    { tipo: "link-externo", destino: "https://exemplo.com", filhos: [{ tipo: "texto", texto: "fonte" }] },
];

describe("abertura do livro — ida e volta", () => {
    it("preserva o itálico externo, as pausas, o negrito e a tarja ao montar e reler", () => {
        const abertura: LivroTrechoDto[] = [
            { tipo: "italico", filhos: [{ tipo: "texto", texto: "Autorização " }, { tipo: "tarja", comprimento: 8 }] },
            { tipo: "texto", texto: "\n\n" },
            { tipo: "italico", filhos: [
                { tipo: "texto", texto: "Você não erra.\n" },
                { tipo: "negrito", filhos: [{ tipo: "texto", texto: "Você escreve." }] },
            ] },
        ];
        const raiz = document.createElement("div");
        montarTrechos(raiz, abertura);
        expect(lerTrechos(raiz)).toEqual(abertura);
    });

    it("tira só as quebras do fim, mesmo dentro do itálico, e não toca no meio", () => {
        const trechos: LivroTrechoDto[] = [
            { tipo: "italico", filhos: [{ tipo: "texto", texto: "Um.\n\nDois.\n\n" }] },
            { tipo: "texto", texto: "\n" },
        ];
        expect(apararQuebrasFinais(trechos)).toEqual([
            { tipo: "italico", filhos: [{ tipo: "texto", texto: "Um.\n\nDois." }] },
        ]);
        expect(apararQuebrasFinais([{ tipo: "texto", texto: "\n\n" }])).toEqual([]);
    });
});

describe("ponte entre texto rico e DOM editável", () => {
    it("monta e lê de volta o mesmo texto rico, átomos intactos", () => {
        const raiz = document.createElement("div");
        montarTrechos(raiz, rico);
        expect(raiz.querySelectorAll("[data-trecho]").length).toBe(4);
        expect(lerTrechos(raiz)).toEqual(rico);
    });

    it("lê o que o navegador produz ao digitar: <b>, <i>, spans soltos e nbsp", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = "um&nbsp;<b>dois</b> <span>três <i>quatro</i></span>";
        expect(lerTrechos(raiz)).toEqual([
            { tipo: "texto", texto: "um " },
            { tipo: "negrito", filhos: [{ tipo: "texto", texto: "dois" }] },
            { tipo: "texto", texto: " três " },
            { tipo: "italico", filhos: [{ tipo: "texto", texto: "quatro" }] },
        ]);
    });

    it("junta textos vizinhos, descarta marcação vazia e compara sem depender da fragmentação", () => {
        expect(normalizarTrechos([
            { tipo: "texto", texto: "a" }, { tipo: "texto", texto: "b" },
            { tipo: "negrito", filhos: [] }, { tipo: "texto", texto: "" },
        ])).toEqual([{ tipo: "texto", texto: "ab" }]);
        expect(trechosIguais(
            [{ tipo: "texto", texto: "ab" }],
            [{ tipo: "texto", texto: "a" }, { tipo: "texto", texto: "b" }],
        )).toBe(true);
        expect(textoDe(rico)).toBe("Role Vigor forte contra NA Médio [3] e veja Morrendofonte");
    });

    it("trata átomo adulterado como texto comum, sem quebrar", () => {
        const raiz = document.createElement("div");
        const atomo = document.createElement("span");
        atomo.dataset["trecho"] = "{não é json";
        atomo.textContent = "restou";
        raiz.append(atomo);
        expect(lerTrechos(raiz)).toEqual([{ tipo: "texto", texto: "restou" }]);
    });
});

describe("selo de Nível de Ameaça (NA0…NA7 + espaço)", () => {
    it("reconhece a sigla isolada e devolve o texto que sobra antes dela", () => {
        expect(lerSiglaNivel("NA3")).toBe(3);
        expect(lerSiglaNivel("NA8")).toBeNull();
        expect(lerSiglaNivel("NA")).toBeNull();
        expect(detectarNivelAmeaca("NA0 ")).toEqual({ nivel: 0, antes: "" });
        expect(detectarNivelAmeaca("contra NA7 ")).toEqual({ nivel: 7, antes: "contra " });
    });

    it("não converte sigla colada em outra palavra nem sem o espaço", () => {
        expect(detectarNivelAmeaca("ANA3 ")).toBeNull();
        expect(detectarNivelAmeaca("NA3")).toBeNull();
        expect(detectarNivelAmeaca("NA33 ")).toBeNull();
    });

    it("o selo carrega o trecho no formato da fonte", () => {
        const selo = criarSeloNivel(document, 3);
        expect(textoNivelAmeaca(3)).toBe("NA Médio [3]");
        expect(JSON.parse(selo.dataset["trecho"] as string)).toEqual({ tipo: "nivel-ameaca", nivel: 3, texto: "NA Médio [3]" });
        expect(selo.contentEditable).toBe("false");
    });
});

describe("dividir o texto no Enter do meio do parágrafo", () => {
    it("parte o texto e as marcações no ponto, contando cada átomo como um caractere", () => {
        const trechos: LivroTrechoDto[] = [
            { tipo: "texto", texto: "ab" },
            { tipo: "negrito", filhos: [{ tipo: "texto", texto: "cdef" }] },
            { tipo: "nivel-ameaca", nivel: 1, texto: "NA Nulo [1]" },
            { tipo: "texto", texto: "gh" },
        ];
        const [antes, depois] = dividirTrechos(trechos, 4);
        expect(antes).toEqual([{ tipo: "texto", texto: "ab" }, { tipo: "negrito", filhos: [{ tipo: "texto", texto: "cd" }] }]);
        expect(depois).toEqual([
            { tipo: "negrito", filhos: [{ tipo: "texto", texto: "ef" }] },
            { tipo: "nivel-ameaca", nivel: 1, texto: "NA Nulo [1]" },
            { tipo: "texto", texto: "gh" },
        ]);
        expect(dividirTrechos(trechos, 0)[0]).toEqual([]);
        expect(dividirTrechos(trechos, 99)[1]).toEqual([]);
    });
});

describe("custo de Energia digitado", () => {
    it("aceita inteiro de 0 a 99 e X; recusa o resto", () => {
        expect(lerCustoDigitado(" 3 ")).toBe(3);
        expect(lerCustoDigitado("0")).toBe(0);
        expect(lerCustoDigitado("x")).toBe("X");
        expect(lerCustoDigitado("X")).toBe("X");
        for (const invalido of ["", "-1", "100", "1,5", "2x", "XX", "abc"]) {
            expect(lerCustoDigitado(invalido), invalido).toBeNull();
        }
    });
});
