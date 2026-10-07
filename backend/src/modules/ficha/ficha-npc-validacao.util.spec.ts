import { describe, expect, it } from "vitest";
import type { FichaNpcDadosDto } from "@contratados-rpg/shared/dtos/ficha";
import type { CarrinhoItemDto } from "@contratados-rpg/shared/regras/compras";
import {
    CategoriaNpcEnum, HabilidadeTipoNpcEnum, ItemCategoriaEnum, ModificacaoEfeitoTipoEnum,
    PatenteEnum,
} from "@contratados-rpg/shared/enums";
import { BusinessException } from "../../core/exceptions";
import { validarDadosNpc } from "./ficha-npc-validacao.util";

/** Civil: habilidades/atributos dentro do teto (0) sem precisar configurar Competências. */
function criarDadosCivil(): FichaNpcDadosDto {
    return {
        identidadeNarrativa: { nome: "Marta", funcao: "Zeladora" },
        categoria: CategoriaNpcEnum.CIVIL, nivel: 0, cooperacao: 5,
        atributos: {
            forca: 2, destreza: 2, luta: 0, pontaria: 0, vigor: 2,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        },
        vidaMaxima: 15, vidaAtual: 15, defesaBase: 10, bloquear: 12, esquivar: 12,
        energia: { maxima: 0, atual: 0, recargaPorTurno: null },
        sanidade: { sequelas: [], traumas: [] }, habilidades: [],
        condutaCombate: { gatilhosFuga: "", prioridadesAlvo: "", reacaoFerimentoSevero: "" },
    };
}

/** Operativo: 2 Passivas satisfazem o volume mínimo (2–3 total, 1 passiva mínima). */
function criarDadosOperativo(): FichaNpcDadosDto {
    return {
        identidadeNarrativa: { nome: "Rafael", funcao: "Soldado de contenção" },
        categoria: CategoriaNpcEnum.OPERATIVO, nivel: 5, cooperacao: 5,
        atributos: {
            forca: 2, destreza: 2, luta: 3, pontaria: 2, vigor: 2,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        },
        vidaMaxima: 85, vidaAtual: 85, defesaBase: 15, bloquear: 17, esquivar: 17,
        energia: { maxima: 12, atual: 12, recargaPorTurno: null },
        sanidade: { sequelas: [], traumas: [] },
        habilidades: [
            { nomeNeutro: "Treinamento", tipo: HabilidadeTipoNpcEnum.PASSIVA, descricao: "Texto" },
            { nomeNeutro: "Disciplina", tipo: HabilidadeTipoNpcEnum.PASSIVA, descricao: "Texto" },
        ],
        condutaCombate: {
            gatilhosFuga: "Ordem", prioridadesAlvo: "Ameaça", reacaoFerimentoSevero: "Recuar",
        },
    };
}

function item(categoria: ItemCategoriaEnum): CarrinhoItemDto {
    return {
        nome: "Pistola", categoria, custo: 300, peso: 1, quantidade: 1,
        guardada: false, modificacoes: [],
    };
}

describe("validarDadosNpc — estrutura de patenteEquivalente/inventario (m4-20)", () => {
    it("aceita NPC sem os campos novos (legado)", () => {
        expect(() => validarDadosNpc(criarDadosCivil())).not.toThrow();
        expect(() => validarDadosNpc(criarDadosOperativo())).not.toThrow();
    });

    it("aceita patenteEquivalente dentro da faixa e inventário com itens válidos", () => {
        const dados = {
            ...criarDadosOperativo(), patenteEquivalente: PatenteEnum.OPERADOR,
            inventario: [item(ItemCategoriaEnum.ARMAS_DE_FOGO)],
        };
        expect(() => validarDadosNpc(dados)).not.toThrow();
    });

    it("rejeita patenteEquivalente que não existe no enum", () => {
        const dados = {
            ...criarDadosOperativo(), patenteEquivalente: "INEXISTENTE" as PatenteEnum,
        };
        expect(() => validarDadosNpc(dados)).toThrow(BusinessException);
    });

    it("rejeita inventário que não é array", () => {
        const dados = {
            ...criarDadosOperativo(), inventario: {} as unknown as CarrinhoItemDto[],
        };
        expect(() => validarDadosNpc(dados)).toThrow(BusinessException);
    });

    it("rejeita item de inventário sem a estrutura mínima de CarrinhoItemDto", () => {
        const dados = {
            ...criarDadosOperativo(),
            inventario: [{ nome: "Pistola" } as unknown as CarrinhoItemDto],
        };
        expect(() => validarDadosNpc(dados)).toThrow(
            new BusinessException("Item de inventário do NPC inválido"),
        );
    });

    it.each([
        null,
        { nome: "Resistente", empilhamentos: -1 },
        { nome: "Resistente", empilhamentos: 0 },
        { nome: "Resistente", empilhamentos: 1.5 },
        { nome: "Resistente", empilhamentos: "2" },
        { nome: "Resistente", empilhamentos: Number.NaN },
        { nome: "Custom", empilhamentos: 1, efeitos: [null] },
        { nome: "Custom", empilhamentos: 1, efeitos: [{ tipo: "INEXISTENTE" }] },
        { nome: "Custom", empilhamentos: 1, efeitos: [{ tipo: "RESISTENCIA", valor: "2" }] },
        { nome: "Custom", empilhamentos: 1, efeitos: [{ tipo: "DEFESA", variante: 12 }] },
    ])("rejeita modificação malformada antes do motor puro: %j", (modificacao) => {
        const dados = {
            ...criarDadosOperativo(), patenteEquivalente: PatenteEnum.OPERADOR,
            inventario: [{
                ...item(ItemCategoriaEnum.PROTECOES), modificacoes: [modificacao],
            } as unknown as CarrinhoItemDto],
        };
        expect(() => validarDadosNpc(dados)).toThrow(
            new BusinessException("Item de inventário do NPC inválido"),
        );
    });

    it.each([
        { equipado: "true" }, { resistencia: 20 }, { dano: {} },
        { categoriaEmprestada: "INEXISTENTE" },
    ])("rejeita propriedades opcionais de item com tipos inválidos: %j", (campos) => {
        const dados = {
            ...criarDadosOperativo(),
            inventario: [{
                ...item(ItemCategoriaEnum.PROTECOES), ...campos,
            } as unknown as CarrinhoItemDto],
        };
        expect(() => validarDadosNpc(dados)).toThrow(BusinessException);
    });

    it("aceita item custom com efeitos mecânicos estruturados", () => {
        const dados = {
            ...criarDadosOperativo(), patenteEquivalente: PatenteEnum.OPERADOR,
            inventario: [{
                ...item(ItemCategoriaEnum.PROTECOES), nome: "Proteção custom", equipado: true,
                resistencia: "3 [Físico]", modificacoes: [{
                    nome: "Defensiva", empilhamentos: 1, descricao: "Bônus do mestre",
                    efeitos: [{
                        tipo: ModificacaoEfeitoTipoEnum.DEFESA, variante: "Defesa", valor: 2,
                    }],
                }],
            }],
        };
        expect(() => validarDadosNpc(dados)).not.toThrow();
    });

    it("rejeita patenteEquivalente fora da faixa da Categoria (regra de negócio)", () => {
        const dados = { ...criarDadosOperativo(), patenteEquivalente: PatenteEnum.VETERANO };
        try {
            validarDadosNpc(dados);
            expect.fail("deveria ter lançado BusinessException");
        } catch (erro) {
            expect(erro).toBeInstanceOf(BusinessException);
            expect((erro as BusinessException).getResponse()).toMatchObject({
                erros: ["patente equivalente: fora da faixa da Categoria"],
            });
        }
    });

    it("rejeita Categoria Civil com Proteções/Explosivos no inventário (regra de negócio)", () => {
        const dados = { ...criarDadosCivil(), inventario: [item(ItemCategoriaEnum.EXPLOSIVOS)] };
        try {
            validarDadosNpc(dados);
            expect.fail("deveria ter lançado BusinessException");
        } catch (erro) {
            expect(erro).toBeInstanceOf(BusinessException);
            expect((erro as BusinessException).getResponse()).toMatchObject({
                erros: ["inventário: Categoria Civil não pode ter Proteções ou Explosivos"],
            });
        }
    });
});
