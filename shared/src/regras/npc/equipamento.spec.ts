import { describe, expect, it } from "vitest";
import { CategoriaNpcEnum, ItemCategoriaEnum, PatenteEnum } from "../../enums";
import type { FichaNpcDadosDto } from "../../dtos/ficha";
import type { CarrinhoItemDto } from "../compras";
import {
    CATEGORIAS_VETADAS_NPC_CIVIL, calcularDefesasNpc, listarPatentesEquivalentes,
    obterLimiteModificacoesNpc, validarEquipamentoNpc,
} from "./equipamento";

/** Fixture mínima — só os campos relevantes à validação de equipamento. */
const veterano: FichaNpcDadosDto = {
    identidadeNarrativa: { nome: "Lívia", funcao: "Coordenadora de contenção" },
    categoria: CategoriaNpcEnum.VETERANO, nivel: 8, cooperacao: 6,
    atributos: {
        forca: 2, destreza: 3, luta: 4, pontaria: 2, vigor: 3,
        intelecto: 2, medicina: 1, sentidos: 1, social: 1, vontade: 2,
    },
    vidaMaxima: 245, vidaAtual: 245, defesaBase: 18, bloquear: 21, esquivar: 21,
    energia: { maxima: 21, atual: 21, recargaPorTurno: null },
    sanidade: { sequelas: [], traumas: [] }, habilidades: [],
    condutaCombate: { gatilhosFuga: "", prioridadesAlvo: "", reacaoFerimentoSevero: "" },
};

const civil: FichaNpcDadosDto = { ...veterano, categoria: CategoriaNpcEnum.CIVIL };

describe("NPC — snapshot defensivo + equipamento (Sistema: Proteções e Escudos)", () => {
    it("preserva snapshots do legado e soma só equipamentos em uso", () => {
        expect(calcularDefesasNpc(veterano)).toEqual({ defesa: 18, bloqueio: 21, esquiva: 21 });
        const protecao: CarrinhoItemDto = {
            nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES,
            custo: 500, peso: 2, quantidade: 1, guardada: false, equipado: true,
            modificacoes: [{ nome: "Resistente", empilhamentos: 2 }],
        };
        const dados = { ...veterano, inventario: [protecao] };
        expect(calcularDefesasNpc(dados)).toEqual({ defesa: 18, bloqueio: 22, esquiva: 21 });
        expect(dados.bloquear).toBe(21);
        expect(calcularDefesasNpc({ ...dados, inventario: [{ ...protecao, equipado: false }] }))
            .toEqual({ defesa: 18, bloqueio: 21, esquiva: 21 });
    });
});

function item(categoria: ItemCategoriaEnum, nome = "Item"): CarrinhoItemDto {
    return {
        nome, categoria, custo: 100, peso: 1, quantidade: 1, guardada: false, modificacoes: [],
    };
}

describe("NPC — faixa de Patente Equivalente por Categoria (Guia v4.2.0)", () => {
    it("Civil não tem patente equivalente", () => {
        expect(listarPatentesEquivalentes({ categoria: CategoriaNpcEnum.CIVIL })).toEqual([]);
    });

    it.each([
        [CategoriaNpcEnum.OPERATIVO, [PatenteEnum.AGENTE, PatenteEnum.OPERADOR]],
        [CategoriaNpcEnum.VETERANO, [PatenteEnum.EXPERIENTE, PatenteEnum.VETERANO]],
        [CategoriaNpcEnum.ELITE, [
            PatenteEnum.FORCA_TAREFA,
            PatenteEnum.FORCA_TAREFA_ESPECIAL,
            PatenteEnum.OPERACOES_ESPECIAIS,
        ]],
        [CategoriaNpcEnum.LENDARIO, [PatenteEnum.LIDER_OPERACIONAL]],
    ] as const)("%s cobre a faixa %s", (categoria, faixa) => {
        expect(listarPatentesEquivalentes({ categoria })).toEqual(faixa);
    });
});

describe("NPC — limite de modificações da patente escolhida (sem Prestígio)", () => {
    it("sem patenteEquivalente, nenhuma modificação permitida", () => {
        expect(obterLimiteModificacoesNpc({})).toBeNull();
    });

    it("lê o limite direto da tabela de patentes, igual ao agente na mesma patente", () => {
        expect(obterLimiteModificacoesNpc({ patenteEquivalente: PatenteEnum.AGENTE }))
            .toEqual({ patente: PatenteEnum.AGENTE, maxEmpilhamentos: 1, maxModificacoes: 2 });
        expect(obterLimiteModificacoesNpc({ patenteEquivalente: PatenteEnum.OPERACOES_ESPECIAIS }))
            .toEqual({
                patente: PatenteEnum.OPERACOES_ESPECIAIS, maxEmpilhamentos: 4, maxModificacoes: 18,
            });
    });

    it("a mesma Categoria Elite varia de limite conforme a patente escolhida pelo mestre", () => {
        const piso = obterLimiteModificacoesNpc({ patenteEquivalente: PatenteEnum.FORCA_TAREFA });
        const teto = obterLimiteModificacoesNpc({
            patenteEquivalente: PatenteEnum.OPERACOES_ESPECIAIS,
        });
        expect(piso?.maxModificacoes).toBe(12);
        expect(teto?.maxModificacoes).toBe(18);
    });
});

describe("NPC — validarEquipamentoNpc", () => {
    it.each([
        [PatenteEnum.FORCA_TAREFA, 12],
        [PatenteEnum.OPERACOES_ESPECIAIS, 18],
    ] as const)("Elite %s aceita exatamente %i empilhamentos e recusa o próximo", (patente, limite) => {
        const modificacoes = Array.from({ length: limite }, (_, indice) => ({
            nome: `Ajuste narrativo ${indice}`, empilhamentos: 1,
        }));
        const dados = { ...veterano, categoria: CategoriaNpcEnum.ELITE,
            patenteEquivalente: patente, inventario: [{ ...item(ItemCategoriaEnum.SEM_CATEGORIA),
                modificacoes }] };
        expect(validarEquipamentoNpc(dados)).toEqual([]);
        expect(validarEquipamentoNpc({ ...dados, inventario: [{ ...dados.inventario[0],
            modificacoes: [...modificacoes, { nome: "Excedente", empilhamentos: 1 }] }] }))
            .toEqual([`inventário: "Item" excede o limite de modificações da patente (${limite})`]);
    });
    it("respeita empilhamentos iniciais e teto próprio das modificações do catálogo", () => {
        const protecao = { ...item(ItemCategoriaEnum.PROTECOES, "Colete de Kevlar"),
            modificacoes: [{ nome: "Resistente", empilhamentos: 1 }] };
        expect(validarEquipamentoNpc({ ...veterano, patenteEquivalente: PatenteEnum.VETERANO,
            inventario: [protecao] }).join(" ")).toContain("catálogo");
        const arma = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO, "Pistola"),
            modificacoes: [{ nome: "Alcance", empilhamentos: 2 }] };
        expect(validarEquipamentoNpc({ ...veterano, patenteEquivalente: PatenteEnum.VETERANO,
            inventario: [arma] }).join(" ")).toContain("catálogo");
    });

    it("recusa modificações incompatíveis pelo motor de compras", () => {
        const arma = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO, "Pistola"),
            modificacoes: [{ nome: "Explosiva", empilhamentos: 1 },
                { nome: "Silenciada", empilhamentos: 1 }] };
        expect(validarEquipamentoNpc({ ...veterano, patenteEquivalente: PatenteEnum.VETERANO,
            inventario: [arma] }).join(" ")).toContain("conflito");
    });
    it("ficha sem patenteEquivalente nem inventário é válida (legado)", () => {
        expect(validarEquipamentoNpc(veterano)).toEqual([]);
    });

    it("aceita patenteEquivalente dentro da faixa da Categoria", () => {
        expect(validarEquipamentoNpc(
            { ...veterano, patenteEquivalente: PatenteEnum.VETERANO },
        )).toEqual([]);
        expect(validarEquipamentoNpc(
            { ...veterano, patenteEquivalente: PatenteEnum.EXPERIENTE },
        )).toEqual([]);
    });

    it("rejeita patenteEquivalente fora da faixa da Categoria", () => {
        expect(validarEquipamentoNpc({ ...veterano, patenteEquivalente: PatenteEnum.AGENTE }))
            .toEqual(["patente equivalente: fora da faixa da Categoria"]);
    });

    it("rejeita qualquer patenteEquivalente na Categoria Civil", () => {
        expect(validarEquipamentoNpc({ ...civil, patenteEquivalente: PatenteEnum.AGENTE }))
            .toEqual(["patente equivalente: Categoria Civil não tem patente equivalente"]);
    });

    it("Civil não pode ter Proteções nem Explosivos no inventário", () => {
        for (const categoria of CATEGORIAS_VETADAS_NPC_CIVIL) {
            expect(validarEquipamentoNpc({ ...civil, inventario: [item(categoria)] }))
                .toEqual(["inventário: Categoria Civil não pode ter Proteções ou Explosivos"]);
        }
    });

    it("Civil aceita categorias não vetadas no inventário", () => {
        const dados = { ...civil, inventario: [item(ItemCategoriaEnum.CORPO_A_CORPO)] };
        expect(validarEquipamentoNpc(dados)).toEqual([]);
    });

    it("Veterano aceita Proteções/Explosivos no inventário (veto é só da Categoria Civil)", () => {
        const dados = { ...veterano, inventario: [item(ItemCategoriaEnum.PROTECOES)] };
        expect(validarEquipamentoNpc(dados)).toEqual([]);
    });

    it("rejeita item com modificação quando não há patenteEquivalente escolhida", () => {
        const comMod = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO),
            modificacoes: [{ nome: "Mira", empilhamentos: 1 }] };
        expect(validarEquipamentoNpc({ ...veterano, inventario: [comMod] })).toEqual([
            'inventário: "Item" tem modificação sem patente equivalente escolhida',
        ]);
    });

    it("aceita modificação dentro do limite da patente escolhida", () => {
        const comMod = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO),
            modificacoes: [{ nome: "Mira", empilhamentos: 2 }] };
        const dados = {
            ...veterano, patenteEquivalente: PatenteEnum.VETERANO, inventario: [comMod],
        };
        expect(validarEquipamentoNpc(dados)).toEqual([]);
    });

    it("rejeita empilhamento de uma modificação acima do teto da patente", () => {
        const comMod = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO),
            modificacoes: [{ nome: "Mira", empilhamentos: 4 }] };
        const dados = {
            ...veterano, patenteEquivalente: PatenteEnum.VETERANO, inventario: [comMod],
        };
        expect(validarEquipamentoNpc(dados)).toEqual([
            'inventário: "Item" tem modificação acima do empilhamento da patente (3)',
        ]);
    });

    it("rejeita total de modificações do item acima do limite da patente", () => {
        const comMod = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO),
            modificacoes: [
                { nome: "Mira", empilhamentos: 3 }, { nome: "Ajuste B", empilhamentos: 3 },
                { nome: "Coronha", empilhamentos: 3 }, { nome: "Supressor", empilhamentos: 1 },
            ] };
        const dados = {
            ...veterano, patenteEquivalente: PatenteEnum.VETERANO, inventario: [comMod],
        };
        expect(validarEquipamentoNpc(dados)).toEqual([
            'inventário: "Item" excede o limite de modificações da patente (9)',
        ]);
    });

    it("a mesma Categoria Elite libera menos modificação total com a patente piso que com o teto", () => {
        const dadosElite: FichaNpcDadosDto = { ...veterano, categoria: CategoriaNpcEnum.ELITE };
        const comMods = { ...item(ItemCategoriaEnum.ARMAS_DE_FOGO),
            modificacoes: [
                { nome: "Mira", empilhamentos: 3 }, { nome: "Ajuste B", empilhamentos: 3 },
                { nome: "Coronha", empilhamentos: 3 }, { nome: "Supressor", empilhamentos: 3 },
                { nome: "Cano", empilhamentos: 3 },
            ] };
        const comPiso = {
            ...dadosElite, patenteEquivalente: PatenteEnum.FORCA_TAREFA, inventario: [comMods],
        };
        const comTeto = {
            ...dadosElite,
            patenteEquivalente: PatenteEnum.OPERACOES_ESPECIAIS,
            inventario: [comMods],
        };
        expect(validarEquipamentoNpc(comPiso)).toEqual([
            'inventário: "Item" excede o limite de modificações da patente (12)',
        ]);
        expect(validarEquipamentoNpc(comTeto)).toEqual([]);
    });

    it("acumula violação de patente e de inventário Civil na mesma ficha", () => {
        expect(validarEquipamentoNpc({
            ...civil,
            patenteEquivalente: PatenteEnum.AGENTE,
            inventario: [item(ItemCategoriaEnum.EXPLOSIVOS)],
        })).toEqual([
            "patente equivalente: Categoria Civil não tem patente equivalente",
            "inventário: Categoria Civil não pode ter Proteções ou Explosivos",
        ]);
    });
});
