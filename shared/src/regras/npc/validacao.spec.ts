import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type { FichaNpcDadosDto } from "../../dtos/ficha";
import { validarFichaNpc } from "./validacao";

/** Fixture própria: Veterano, Nível 8, +11 pontos, duas Passivas/uma Ativa (guia de NPCs). */
const veterano: FichaNpcDadosDto = {
    identidadeNarrativa: { nome: "Lívia", funcao: "Coordenadora de contenção" },
    categoria: CategoriaNpcEnum.VETERANO, nivel: 8, cooperacao: 6,
    atributos: {
        forca: 2, destreza: 3, luta: 4, pontaria: 2, vigor: 3,
        intelecto: 2, medicina: 1, sentidos: 1, social: 1, vontade: 2,
    },
    vidaMaxima: 245, vidaAtual: 245, defesaBase: 18, bloquear: 21, esquivar: 21,
    energia: { maxima: 21, atual: 21, recargaPorTurno: null },
    sanidade: { sequelas: [], traumas: [] },
    habilidades: [
        {
            nomeNeutro: "Resistência Forjada", tipo: HabilidadeTipoNpcEnum.PASSIVA,
            descricao: "Vida temporária igual a VIG × 3 no início do combate.",
        },
        {
            nomeNeutro: "Adaptação em Campo", tipo: HabilidadeTipoNpcEnum.PASSIVA,
            descricao: "+1 dado por 2 turnos quando um aliado próximo é derrotado.",
        },
        {
            nomeNeutro: "Coordenação", tipo: HabilidadeTipoNpcEnum.ATIVA, custoEnergia: 7,
            descricao: "Até 2 aliados próximos atacam ou se reposicionam.",
            restricao: "Uma vez por rodada",
        },
    ],
    condutaCombate: {
        gatilhosFuga: "Perda da equipe", prioridadesAlvo: "Ameaça ao esquadrão",
        reacaoFerimentoSevero: "Buscar cobertura",
    },
};

describe("NPC — coerência da ficha (guia: Categoria, Nível, Cooperação, Atributos e Volume)", () => {
    it("aceita a ficha completa e não a modifica", () => {
        const antes = structuredClone(veterano);
        expect(validarFichaNpc(veterano)).toEqual({ violacoes: [] });
        expect(veterano).toEqual(antes);
    });

    it.each([0, 20])("aceita Nível %i fora da faixa sugerida do Veterano", (nivel) => {
        expect(validarFichaNpc({ ...veterano, nivel })).toEqual({ violacoes: [] });
    });

    it.each([0, 10])("aceita Cooperação %i independente da categoria", (cooperacao) => {
        expect(validarFichaNpc({ ...veterano, cooperacao })).toEqual({ violacoes: [] });
    });

    it.each([-1, 21, 1.5, NaN, Infinity])("rejeita Nível inválido %s", (nivel) => {
        expect(validarFichaNpc({ ...veterano, nivel }).violacoes)
            .toEqual(["nível: deve ser inteiro entre 0 e 20"]);
    });

    it.each([-1, 11, 2.5, NaN, Infinity])("rejeita Cooperação inválida %s", (cooperacao) => {
        expect(validarFichaNpc({ ...veterano, cooperacao }).violacoes)
            .toEqual(["cooperação: deve ser inteiro entre 0 e 10"]);
    });

    it("acumula violações de atributos, composição, Nível e Cooperação", () => {
        const { violacoes } = validarFichaNpc({
            ...veterano, nivel: 30, cooperacao: -1, habilidades: [],
            atributos: { ...veterano.atributos, luta: 5 },
        });
        expect(violacoes).toEqual([
            "luta: valor acima do limite (4)",
            "habilidades: total deve estar entre 3 e 4", "habilidades: mínimo de 2 passivas",
            "nível: deve ser inteiro entre 0 e 20", "cooperação: deve ser inteiro entre 0 e 10",
        ]);
    });

    it("preserva recursos acima dos máximos e snapshots ajustados pelo mestre", () => {
        const editado = {
            ...veterano, vidaMaxima: 400, vidaAtual: 450,
            defesaBase: 50, bloquear: 51, esquivar: 52,
            energia: { maxima: 60, atual: 75, recargaPorTurno: null },
            sanidade: {
                sequelas: [{ nome: "Insônia", descricao: "Pesadelos recorrentes" }],
                traumas: [{ nome: "Paranoia", tratado: true }],
            },
        };
        const antes = structuredClone(editado);
        expect(validarFichaNpc(editado)).toEqual({ violacoes: [] });
        expect(editado).toEqual(antes);
    });

    it("não lança erro para Categoria desconhecida recebida fora do cliente tipado", () => {
        expect(validarFichaNpc({
            ...veterano, categoria: "INEXISTENTE" as CategoriaNpcEnum,
        }).violacoes).toEqual(["categoria: valor inválido"]);
    });
});
