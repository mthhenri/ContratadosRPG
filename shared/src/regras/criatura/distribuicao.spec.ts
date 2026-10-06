import { describe, expect, it } from "vitest";
import { calcularDistribuicaoAtributosCriatura, validarRealocacaoAtributos } from "./atributos";

/** Guia v4.2.0 > Atributos > Realocação: até três pontos no total, inclusive negativos. */
describe("distribuição inicial de atributos de Criatura", () => {
    const atributos = {
        destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1,
        intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
    };

    it("devolve três pontos retirados de duas origens, com Social negativo", () => {
        const distribuicao = calcularDistribuicaoAtributosCriatura({
            vd: 5, atributosFinal: { ...atributos, social: -1, medicina: 0 },
        });
        expect(distribuicao).toMatchObject({
            base: 1, limite: 4, minimo: -2, pontosAjuste: 1,
            pontosRealocados: 3, limiteRealocacao: 3, gastos: -3, saldo: 4,
        });
        expect(distribuicao.violacoes).toContain("atributos: restam 4 pontos para distribuir");
    });

    it("aceita distribuição exata usando apenas os pontos realmente devolvidos", () => {
        expect(validarRealocacaoAtributos({ vd: 5, atributosFinal: {
            ...atributos, social: -1, medicina: 0, forca: 4, luta: 2,
        } })).toEqual([]);
    });

    it("rejeita quatro retirados no total mesmo com saldo zero e cada origem dentro do piso", () => {
        expect(validarRealocacaoAtributos({ vd: 5, atributosFinal: {
            ...atributos, social: -1, medicina: -1, forca: 4, luta: 3,
        } })).toEqual(["realocação: 4 pontos retirados excedem o limite total de 3"]);
    });

    it.each([
        [{ ...atributos, forca: 5 }, "forca: valor acima do limite (4)"],
        [{ ...atributos, social: -3 }, "realocação: 4 pontos retirados excedem o limite total de 3"],
        [{ ...atributos, forca: 1.5 }, "forca: valor deve ser inteiro"],
        [{ ...atributos, social: NaN }, "social: valor deve ser inteiro"],
        [{ ...atributos, social: Infinity }, "social: valor deve ser inteiro"],
        [{ ...atributos, forca: 3 }, "atributos: distribuição excede o orçamento em 1 pontos"],
    ])("rejeita teto, piso, fração, valores não finitos e excesso de orçamento", (atributosFinal, erro) => {
        expect(validarRealocacaoAtributos({ vd: 5, atributosFinal })).toContain(erro);
    });

    it("preserva os atributos recebidos, inclusive quando a nova faixa de VD os invalida", () => {
        const atributosFinal = { ...atributos, social: -1, medicina: 0, forca: 4, luta: 2 };
        const original = { ...atributosFinal };
        expect(validarRealocacaoAtributos({ vd: 30, atributosFinal }).length).toBeGreaterThan(0);
        expect(atributosFinal).toEqual(original);
    });
});
