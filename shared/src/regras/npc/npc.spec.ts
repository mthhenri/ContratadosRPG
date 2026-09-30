import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type { FichaAtributosDto, FichaNpcHabilidadeDto } from "../../dtos/ficha";
import {
    calcularBloquear, calcularDefesaBase, calcularDtAtributo, calcularEnergia,
    calcularEsquivar, calcularVidaMaxima, obterPontosELimitePorCategoria,
    obterVolumeHabilidadesPorCategoria, validarAtributosCategoria, validarVolumeHabilidades,
} from "./index";

const atributos: FichaAtributosDto = {
    forca: 1, destreza: 1, luta: 1, pontaria: 1, vigor: 1,
    intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
};

function habilidade(tipo: HabilidadeTipoNpcEnum): FichaNpcHabilidadeDto {
    return {
        nomeNeutro: "Treinamento", tipo, descricao: "Efeito biográfico",
        ...(tipo === HabilidadeTipoNpcEnum.ATIVA ? { custoEnergia: 3 } : {}),
    };
}

function habilidades(passivas: number, ativas: number): readonly FichaNpcHabilidadeDto[] {
    return [
        ...Array.from({ length: passivas }, () => habilidade(HabilidadeTipoNpcEnum.PASSIVA)),
        ...Array.from({ length: ativas }, () => habilidade(HabilidadeTipoNpcEnum.ATIVA)),
    ];
}

// Oráculos literais das tabelas/fórmulas do guia de mestre — "Guia de Criação de NPCs",
// Construção Mecânica (Atributos/Vida/Energia/Defesa/DT) e Habilidades (Volume).
describe("NPC — tabelas e cálculos de criação", () => {
    it.each([
        [CategoriaNpcEnum.CIVIL, 2, 2, 31, 0],
        [CategoriaNpcEnum.OPERATIVO, 6, 3, 85, 14],
        [CategoriaNpcEnum.VETERANO, 11, 4, 165, 21],
        [CategoriaNpcEnum.ELITE, 17, 5, 285, { pool: 27, recarga: 3 }],
        [CategoriaNpcEnum.LENDARIO, 24, 6, 480, { pool: 37, recarga: 6 }],
    ])("%s: pontos, cap, Vida (Nível 4/VIG 3) e Energia (DES 3)",
        (categoria, pontosDistribuir, limite, vida, energia) => {
            expect(obterPontosELimitePorCategoria({ categoria }))
                .toEqual({ pontosDistribuir, limite });
            expect(calcularVidaMaxima({ categoria, nivel: 4, vigor: 3 })).toBe(vida);
            expect(calcularEnergia({ categoria, destreza: 3 })).toEqual(energia);
        });

    it.each([
        [CategoriaNpcEnum.CIVIL, 10, 0],
        [CategoriaNpcEnum.OPERATIVO, 15, 8],
        [CategoriaNpcEnum.VETERANO, 25, 12],
        [CategoriaNpcEnum.ELITE, 40, { pool: 18, recarga: 0 }],
        [CategoriaNpcEnum.LENDARIO, 60, { pool: 25, recarga: 0 }],
    ])("%s: bases em Nível/VIG/DES zero", (categoria, vida, energia) => {
        expect(calcularVidaMaxima({ categoria, nivel: 0, vigor: 0 })).toBe(vida);
        expect(calcularEnergia({ categoria, destreza: 0 })).toEqual(energia);
    });

    it("Defesa e reações usam seus respectivos atributos", () => {
        expect(calcularDefesaBase({ nivel: 20 })).toBe(30);
        expect(calcularBloquear({ defesaBase: 18, vigor: 4 })).toBe(22);
        expect(calcularEsquivar({ defesaBase: 18, destreza: 2 })).toBe(20);
    });

    it("DT varia com o atributo do contexto", () => {
        expect(calcularDtAtributo({ nivel: 8, valorAtributo: 0 })).toBe(18);
        expect(calcularDtAtributo({ nivel: 8, valorAtributo: 3 })).toBe(24);
        expect(calcularDtAtributo({ nivel: 20, valorAtributo: 6 })).toBe(42);
    });

    it.each([
        [CategoriaNpcEnum.CIVIL, 2], [CategoriaNpcEnum.OPERATIVO, 3],
        [CategoriaNpcEnum.VETERANO, 4], [CategoriaNpcEnum.ELITE, 5],
        [CategoriaNpcEnum.LENDARIO, 6],
    ])("%s: aceita o cap e aponta atributo acima dele", (categoria, limite) => {
        expect(validarAtributosCategoria({ categoria, atributos: { ...atributos, vigor: limite } }))
            .toEqual([]);
        expect(validarAtributosCategoria({
            categoria, atributos: { ...atributos, vigor: limite + 1 },
        })).toEqual([`vigor: valor acima do limite (${limite})`]);
    });

    it("Civil com combate desbloqueado respeita o cap sem marcador de permissão", () => {
        expect(validarAtributosCategoria({
            categoria: CategoriaNpcEnum.CIVIL,
            atributos: { ...atributos, luta: 2, pontaria: 0 },
        })).toEqual([]);
    });

    it.each([-1, 1.5, NaN, Infinity])("rejeita atributo inválido %s", (vigor) => {
        expect(validarAtributosCategoria({
            categoria: CategoriaNpcEnum.VETERANO, atributos: { ...atributos, vigor },
        })).not.toEqual([]);
    });
});

describe("NPC — volume de habilidades", () => {
    it.each([
        [CategoriaNpcEnum.CIVIL, 0, 0, 0, 0, 0],
        [CategoriaNpcEnum.OPERATIVO, 2, 3, 1, 2, 4],
        [CategoriaNpcEnum.VETERANO, 3, 4, 2, 2, 4],
        [CategoriaNpcEnum.ELITE, 4, 6, 3, 3, 5],
        [CategoriaNpcEnum.LENDARIO, 6, 8, 4, 4, 6],
    ])("%s: tabela completa", (categoria, totalMinimo, totalMaximo,
        passivasMinimas, ativasMaximas, limitePorTurno) => {
        expect(obterVolumeHabilidadesPorCategoria({ categoria })).toEqual({
            totalMinimo, totalMaximo, passivasMinimas, ativasMaximas, limitePorTurno,
        });
    });

    it.each([
        [CategoriaNpcEnum.CIVIL, 0, 0], [CategoriaNpcEnum.OPERATIVO, 1, 1],
        [CategoriaNpcEnum.VETERANO, 2, 1], [CategoriaNpcEnum.ELITE, 3, 1],
        [CategoriaNpcEnum.LENDARIO, 4, 2],
    ])("%s: composição mínima válida", (categoria, passivas, ativas) => {
        expect(validarVolumeHabilidades({ categoria, habilidades: habilidades(passivas, ativas) }))
            .toEqual([]);
    });

    it.each([
        [CategoriaNpcEnum.OPERATIVO, 1, 2], [CategoriaNpcEnum.VETERANO, 2, 2],
        [CategoriaNpcEnum.ELITE, 3, 3], [CategoriaNpcEnum.LENDARIO, 4, 4],
    ])("%s: composição máxima válida", (categoria, passivas, ativas) => {
        expect(validarVolumeHabilidades({ categoria, habilidades: habilidades(passivas, ativas) }))
            .toEqual([]);
    });

    it("Civil sem habilidades; qualquer habilidade viola a categoria", () => {
        expect(validarVolumeHabilidades({
            categoria: CategoriaNpcEnum.CIVIL, habilidades: habilidades(1, 0),
        })).not.toEqual([]);
    });

    it.each([
        [0, 0, "total"], [5, 0, "total"], [1, 2, "passivas"], [0, 3, "ativas"],
    ])("Veterano: reporta composição %i passivas/%i ativas inválida", (passivas, ativas, motivo) => {
        expect(validarVolumeHabilidades({
            categoria: CategoriaNpcEnum.VETERANO, habilidades: habilidades(passivas, ativas),
        }).some((violacao) => violacao.includes(motivo))).toBe(true);
    });

    it("Passivas condicionais não consomem limite por turno nem slots de Ativas", () => {
        expect(validarVolumeHabilidades({
            categoria: CategoriaNpcEnum.LENDARIO,
            habilidades: habilidades(8, 0).map((passiva) => ({
                ...passiva, restricao: "Quando um aliado cair",
            })),
        })).toEqual([]);
    });

    it.each([
        [CategoriaNpcEnum.OPERATIVO, 2, 3], [CategoriaNpcEnum.VETERANO, 3, 4],
        [CategoriaNpcEnum.ELITE, 4, 6], [CategoriaNpcEnum.LENDARIO, 6, 8],
    ])("%s: rejeita totais imediatamente fora da faixa", (categoria, minimo, maximo) => {
        for (const total of [minimo - 1, maximo + 1]) {
            expect(validarVolumeHabilidades({ categoria, habilidades: habilidades(total, 0) })
                .some((violacao) => violacao.includes("total"))).toBe(true);
        }
    });

    it("rejeita tipo GATILHO recebido de um cliente não tipado", () => {
        expect(validarVolumeHabilidades({
            categoria: CategoriaNpcEnum.OPERATIVO,
            habilidades: [habilidade(HabilidadeTipoNpcEnum.PASSIVA), {
                nomeNeutro: "Reação", descricao: "Resposta automática",
                tipo: "GATILHO" as HabilidadeTipoNpcEnum,
            }],
        })).toContain("habilidades: tipo deve ser PASSIVA ou ATIVA");
    });
});
