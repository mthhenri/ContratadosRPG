import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum } from "../../enums";
import { consultarAtributosCriacao } from "./criacao";

const atributos = {
    forca: 1, destreza: 1, luta: 1, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
};

describe("NPC — distribuição inicial", () => {
    it("Operativo parte dos dez atributos em 1 e recebe seis pontos", () => {
        expect(consultarAtributosCriacao({ categoria: CategoriaNpcEnum.OPERATIVO,
            atributos, lutaCivilLiberada: false, pontariaCivilLiberada: false }))
            .toMatchObject({ distribuidos: 0, restantes: 6 });
    });
    it("Civil mantém combate em zero sem consumir os pontos livres", () => {
        expect(consultarAtributosCriacao({ categoria: CategoriaNpcEnum.CIVIL,
            atributos: { ...atributos, luta: 0, pontaria: 0, vigor: 2, intelecto: 2 },
            lutaCivilLiberada: false, pontariaCivilLiberada: false }))
            .toEqual({ distribuidos: 2, restantes: 0, violacoes: [] });
    });
    it("Civil pode partir de Luta 1 ao liberar a exceção narrativa", () => {
        expect(consultarAtributosCriacao({ categoria: CategoriaNpcEnum.CIVIL,
            atributos: { ...atributos, pontaria: 0, vigor: 2, intelecto: 2 },
            lutaCivilLiberada: true, pontariaCivilLiberada: false }).violacoes).toEqual([]);
    });
    it("recusa distribuição acima do orçamento sem alterar os valores", () => {
        const entrada = { categoria: CategoriaNpcEnum.OPERATIVO,
            atributos: { ...atributos, forca: 3, destreza: 3, luta: 3, vigor: 3 },
            lutaCivilLiberada: false, pontariaCivilLiberada: false };
        expect(consultarAtributosCriacao(entrada).restantes).toBe(-2);
        expect(entrada.atributos.vigor).toBe(3);
    });
});
