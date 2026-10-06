import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum } from "../../enums";
import { consultarAtributosCriacao } from "./criacao";

const atributos = {
    forca: 1, destreza: 1, luta: 1, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
};

describe("NPC — distribuição inicial", () => {
    // Guia v4.2.0 > NPC > Atributos: remover o ponto inicial permite redistribuí-lo.
    it("Operativo redistribui o ponto de Social zero sem ultrapassar o orçamento", () => {
        expect(consultarAtributosCriacao({ categoria: CategoriaNpcEnum.OPERATIVO,
            atributos: { ...atributos, luta: 3, pontaria: 3, forca: 3, destreza: 2, social: 0 },
            lutaCivilLiberada: false, pontariaCivilLiberada: false }))
            .toEqual({ distribuidos: 6, restantes: 0, violacoes: [] });
    });
    it("retirar um ponto devolve exatamente um ao saldo", () => {
        expect(consultarAtributosCriacao({ categoria: CategoriaNpcEnum.OPERATIVO,
            atributos: { ...atributos, social: 0 },
            lutaCivilLiberada: false, pontariaCivilLiberada: false }))
            .toMatchObject({ distribuidos: -1, restantes: 7 });
    });
    it.each([-1, 0.5, 4])("zero não permite atributo inválido %s", (social) => {
        const consulta = consultarAtributosCriacao({ categoria: CategoriaNpcEnum.OPERATIVO,
            atributos: { ...atributos, social },
            lutaCivilLiberada: false, pontariaCivilLiberada: false });
        expect(consulta.violacoes.some((violacao) => violacao.startsWith("social:"))).toBe(true);
    });
    it.each(["luta", "pontaria"] as const)("Civil libera %s independentemente e pode zerá-lo", (chave) => {
        const consulta = consultarAtributosCriacao({ categoria: CategoriaNpcEnum.CIVIL,
            atributos: { ...atributos, luta: 0, pontaria: 0, vigor: 2, intelecto: 2, social: 2 },
            lutaCivilLiberada: chave === "luta", pontariaCivilLiberada: chave === "pontaria" });
        expect(consulta).toEqual({ distribuidos: 2, restantes: 0, violacoes: [] });
    });
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
