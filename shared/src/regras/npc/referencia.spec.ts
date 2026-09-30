import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum } from "../../enums";
import { obterReferenciaCategoria, obterReferenciaCooperacao } from "./referencia";

describe("NPC — referências narrativas do guia", () => {
    it.each([
        [0, "Hostil"], [1, "Evasivo"], [2, "Desconfiado"], [3, "Desconfiado"],
        [4, "Neutro"], [6, "Neutro"], [7, "Colaborativo"], [9, "Colaborativo"], [10, "Amigável"],
    ])("Cooperação %s: %s", (cooperacao, rotulo) => {
        expect(obterReferenciaCooperacao({ cooperacao }).rotulo)
            .toBe(rotulo);
    });
    it("Categoria informa a faixa sugerida sem restringir o Nível", () => {
        expect(obterReferenciaCategoria({ categoria: CategoriaNpcEnum.LENDARIO }))
            .toMatchObject({ rotulo: "Lendário", nivelSugerido: "14–20" });
    });
    it.each([-1, 11, 0.5, NaN])("recusa Cooperação fora do contrato: %s", (cooperacao) => {
        expect(() => obterReferenciaCooperacao({ cooperacao })).toThrow(RangeError);
    });
});
