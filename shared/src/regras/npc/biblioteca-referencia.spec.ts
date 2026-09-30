import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type { FichaAtributosDto, FichaNpcDadosDto, FichaNpcHabilidadeDto } from "../../dtos/ficha";
import {
    calcularBloquear, calcularDefesaBase, calcularEnergia, calcularEsquivar,
    calcularVidaMaxima, validarFichaNpc,
} from "./index";

/**
 * O guia fornece habilidades, não fichas completas de NPCs. Estes quatro indivíduos são
 * exemplos próprios dentro das faixas sugeridas, montados com a Biblioteca de Referência.
 * Valores esperados calculados à mão pelas fórmulas gerais, sem usar o motor como oráculo.
 * Ações e efeitos em texto não são automatizados. Seleções respeitam o volume de Categoria.
 */
const exemplos: readonly {
    readonly nome: string;
    readonly funcao: string;
    readonly categoria: CategoriaNpcEnum;
    readonly nivel: number;
    readonly atributos: FichaAtributosDto;
    readonly vida: number;
    readonly defesa: number;
    readonly bloquear: number;
    readonly esquivar: number;
    readonly energia: number;
    readonly recarga: number | null;
    readonly passivas: readonly string[];
    readonly ativas: readonly { readonly nome: string; readonly custo: number }[];
}[] = [
    {
        nome: "Rafael", funcao: "Soldado de contenção", categoria: CategoriaNpcEnum.OPERATIVO,
        nivel: 5,
        atributos: {
            forca: 2, destreza: 2, luta: 3, pontaria: 2, vigor: 2,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        },
        vida: 85, defesa: 15, bloquear: 17, esquivar: 17, energia: 12, recarga: null,
        passivas: ["Treinamento de Campo"],
        ativas: [{ nome: "Supressão", custo: 4 }, { nome: "Reposicionamento Tático", custo: 3 }],
    },
    {
        nome: "Lívia", funcao: "Coordenadora de contenção", categoria: CategoriaNpcEnum.VETERANO,
        nivel: 8,
        atributos: {
            forca: 2, destreza: 3, luta: 4, pontaria: 2, vigor: 3,
            intelecto: 2, medicina: 1, sentidos: 1, social: 1, vontade: 2,
        },
        vida: 245, defesa: 18, bloquear: 21, esquivar: 21, energia: 21, recarga: null,
        passivas: ["Resistência Forjada", "Adaptação em Campo"],
        ativas: [{ nome: "Ponto de Pressão", custo: 6 }, { nome: "Coordenação", custo: 7 }],
    },
    {
        nome: "Helena", funcao: "Comandante de força tarefa", categoria: CategoriaNpcEnum.ELITE,
        nivel: 12,
        atributos: {
            forca: 3, destreza: 4, luta: 5, pontaria: 3, vigor: 4,
            intelecto: 2, medicina: 1, sentidos: 2, social: 1, vontade: 2,
        },
        vida: 600, defesa: 22, bloquear: 26, esquivar: 26, energia: 30, recarga: 4,
        passivas: ["Condicionamento Extremo", "Presença de Comando", "Reflexos Superiores"],
        ativas: [{ nome: "Protocolo Ofensivo", custo: 10 }, { nome: "Zona de Controle", custo: 12 }],
    },
    {
        nome: "Augusto", funcao: "Arquiteto de facção", categoria: CategoriaNpcEnum.LENDARIO,
        nivel: 18,
        atributos: {
            forca: 4, destreza: 5, luta: 6, pontaria: 4, vigor: 5,
            intelecto: 3, medicina: 1, sentidos: 2, social: 1, vontade: 3,
        },
        vida: 1440, defesa: 28, bloquear: 33, esquivar: 33, energia: 45, recarga: 10,
        passivas: ["Ápice Humano", "Lenda Viva", "Percepção Absoluta", "Resistência de Lenda"],
        ativas: [{ nome: "Golpe Irreversível", custo: 18 }, { nome: "Comando Total", custo: 15 }],
    },
];

describe("Guia de mestre — NPC > Biblioteca de Referência: fichas completas de criação", () => {
    it.each(exemplos)("$categoria: $nome", (exemplo) => {
        const vidaMaxima = calcularVidaMaxima({
            categoria: exemplo.categoria, nivel: exemplo.nivel, vigor: exemplo.atributos.vigor,
        });
        const defesaBase = calcularDefesaBase({ nivel: exemplo.nivel });
        const bloquear = calcularBloquear({ defesaBase, vigor: exemplo.atributos.vigor });
        const esquivar = calcularEsquivar({ defesaBase, destreza: exemplo.atributos.destreza });
        const energiaCalculada = calcularEnergia({
            categoria: exemplo.categoria, destreza: exemplo.atributos.destreza,
        });
        const maxima = typeof energiaCalculada === "number"
            ? energiaCalculada : energiaCalculada.pool;
        const recargaPorTurno = typeof energiaCalculada === "number"
            ? null : energiaCalculada.recarga;
        expect([vidaMaxima, defesaBase, bloquear, esquivar, maxima, recargaPorTurno]).toEqual([
            exemplo.vida, exemplo.defesa, exemplo.bloquear, exemplo.esquivar,
            exemplo.energia, exemplo.recarga,
        ]);

        const habilidades: readonly FichaNpcHabilidadeDto[] = [
            ...exemplo.passivas.map((nomeNeutro) => ({
                nomeNeutro, tipo: HabilidadeTipoNpcEnum.PASSIVA,
                descricao: "Modelo da Biblioteca de Referência do guia de mestre.",
            })),
            ...exemplo.ativas.map(({ nome, custo }) => ({
                nomeNeutro: nome, tipo: HabilidadeTipoNpcEnum.ATIVA, custoEnergia: custo,
                descricao: "Modelo da Biblioteca de Referência do guia de mestre.",
            })),
        ];
        const dados: FichaNpcDadosDto = {
            identidadeNarrativa: { nome: exemplo.nome, funcao: exemplo.funcao },
            categoria: exemplo.categoria, nivel: exemplo.nivel, cooperacao: 6,
            atributos: exemplo.atributos, vidaMaxima, vidaAtual: vidaMaxima,
            defesaBase, bloquear, esquivar, energia: { maxima, atual: maxima, recargaPorTurno },
            sanidade: { sequelas: [], traumas: [] }, habilidades,
            condutaCombate: {
                gatilhosFuga: "Perda de aliados", prioridadesAlvo: "Ameaça mais próxima",
                reacaoFerimentoSevero: "Recuar para cobertura",
            },
        };
        expect(validarFichaNpc(dados)).toEqual({ violacoes: [] });
    });
});
