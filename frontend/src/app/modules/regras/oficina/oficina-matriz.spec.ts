import { describe, expect, it } from "vitest";

import { adicionarColuna, adicionarLinha, contarColunas, removerLinha, removerUltimaColuna, type Matriz } from "./oficina-matriz";

const t = (texto: string) => [{ tipo: "texto", texto }];
const base: Matriz = { cabecalho: [t("A"), t("B")], linhas: [[t("1"), t("2")], [t("3"), t("4")]] };

describe("oficina-matriz", () => {
    it("conta a maior largura, no mínimo uma coluna", () => {
        expect(contarColunas(base)).toBe(2);
        expect(contarColunas({ cabecalho: [], linhas: [] })).toBe(1);
        expect(contarColunas({ cabecalho: [t("A")], linhas: [[t("1"), t("2"), t("3")]] })).toBe(3);
    });

    it("adiciona e remove linhas sem tocar nas outras", () => {
        const mais = adicionarLinha(base);
        expect(mais.linhas).toHaveLength(3);
        expect(mais.linhas[2]).toEqual([[], []]);
        expect(mais.linhas[0]).toBe(base.linhas[0]);
        expect(removerLinha(mais, 0).linhas).toEqual([base.linhas[1], [[], []]]);
        expect(removerLinha(base, 9).linhas).toEqual(base.linhas);
    });

    it("acrescenta uma coluna em todas as linhas e iguala as curtas", () => {
        const curta: Matriz = { cabecalho: [t("A"), t("B")], linhas: [[t("1")]] };
        const mais = adicionarColuna(curta);
        expect(mais.cabecalho).toEqual([t("A"), t("B"), []]);
        expect(mais.linhas[0]).toEqual([t("1"), [], []]);
    });

    it("não cria cabeçalho que a tabela não tinha", () => {
        expect(adicionarColuna({ cabecalho: [], linhas: [[t("1")]] }).cabecalho).toEqual([]);
    });

    it("tira a última coluna e nunca deixa menos de uma", () => {
        expect(removerUltimaColuna(base)).toEqual({ cabecalho: [t("A")], linhas: [[t("1")], [t("3")]] });
        const uma: Matriz = { cabecalho: [t("A")], linhas: [[t("1")]] };
        expect(removerUltimaColuna(uma)).toBe(uma);
    });
});
