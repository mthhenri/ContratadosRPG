import type { CampanhaMembroFichaResumoDto } from "@contratados-rpg/shared/dtos/campanha";
import { ClasseEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it } from "vitest";
import { resolverCorParticipante } from "./caderno-presenca";

function ficha(id: number, updatedDate: string, cor: string | null): CampanhaMembroFichaResumoDto {
    return {
        id, updatedDate, cor, nome: "Agente", classe: ClasseEnum.COMBATENTE,
        arquetipo: null, imagemUrl: null, acessoCompleto: true,
        morrendo: false, machucado: false, inconsciente: false,
    };
}

describe("resolverCorParticipante", () => {
    const antiga = ficha(4, "2026-10-08T10:00:00Z", "#22c55e");
    const recente = ficha(3, "2026-10-09T10:00:00Z", "#38bdf8");

    it("seleciona pela data, sem depender da ordem nem do id", () => {
        expect(resolverCorParticipante(7, [antiga, recente])).toBe(recente.cor);
        expect(resolverCorParticipante(7, [recente, antiga])).toBe(recente.cor);
    });

    it("desempata pela ficha de maior id", () => {
        const empate = { ...antiga, updatedDate: recente.updatedDate };
        expect(resolverCorParticipante(7, [recente, empate])).toBe(empate.cor);
        expect(resolverCorParticipante(7, [empate, recente])).toBe(empate.cor);
    });

    it("compara instantes, inclusive com fusos diferentes", () => {
        const maisRecente = { ...antiga, updatedDate: "2026-10-09T08:00:00-03:00" };
        expect(resolverCorParticipante(7, [recente, maisRecente])).toBe(antiga.cor);
    });

    it("ignora datas inválidas e preserva a reserva sem ficha válida", () => {
        const invalida = { ...recente, updatedDate: "inválida" };
        expect(resolverCorParticipante(7, [invalida, antiga])).toBe(antiga.cor);
        expect(resolverCorParticipante(7, [invalida])).toBe(resolverCorParticipante(7, []));
        expect(resolverCorParticipante(7, [])).toBe("#f43f5e");
    });

    it("usa a reserva se a mais recente não tem cor, sem usar outra ficha antiga", () => {
        expect(resolverCorParticipante(7, [antiga, { ...recente, cor: null }]))
            .toBe(resolverCorParticipante(7, []));
    });
});
